/**
 * POST /api/meal-plans/generate/chat
 *
 * Unified interpret-and-generate endpoint. Handles two modes:
 *
 *   user_message absent/empty — skip LLM, go directly to slot generation for all
 *                               unlocked slots using the compiled draft preferences.
 *
 *   user_message present      — run the Gemini interpreter tool-call loop,
 *                               apply the resulting operations to the draft, then
 *                               regenerate ALL unlocked slots.
 *
 * Returns updated_slots, interpretation_summary, and is_ambiguous.
 */

import { GoogleGenAI } from "@google/genai";
import type { Content, Part } from "@google/genai";
import { jsonResponse } from "@/lib/server/json-response";
import { validateSession } from "@/lib/server/validate-session";
import { InterpreterResponseSchema } from "@/lib/meal-plan-draft/interpreter-schema";
import { dayOfWeekFromDate } from "@/lib/meal-plan-draft";
import {
	generateSlots,
	type GeneratorInput,
} from "@/lib/meal-plan-draft/generator";
import { compilePreferences } from "@/lib/meal-plan-draft/preference-compiler";
import { ChatRequestSchema } from "@/lib/schemas/meal-plans/generate/draft-schema";
import type {
	DraftSlot,
	MealPlanDraft,
	PrefPatchOp,
	PostChatRequest,
	SlotKey,
} from "@/lib/schemas/meal-plans/generate/draft-schema";
import {
	SYSTEM_PROMPT,
	FUNCTION_DECLARATIONS,
} from "@/lib/meal-plan-draft/interpreter-prompt";
import {
	enrichExcludeIngredientFilters,
	findInvalidRecipeIds,
	findInvalidDates,
	summaryImpliesActions,
	searchRecipes,
	buildDraftContext,
} from "@/lib/meal-plan-draft/interpreter-helpers";
import { applyOperationsToDraft } from "@/lib/meal-plan-draft/apply-operations";
import {
	fetchLibraryRecipes,
	fetchCatalogRecipes,
	deduplicateCandidates,
	fetchProfileTargets,
} from "@/lib/meal-plan-draft/recipe-fetchers";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY as string;
const MAX_TOOL_ROUNDS = 10;

// ==========================================
// Handler
// ==========================================

export type PostChatResponse = Awaited<ReturnType<typeof POST>>;

export async function POST(req: Request) {
	const session = await validateSession(req);
	if (!session.user) {
		return jsonResponse({ error: "Unauthorized" }, { status: 401 });
	}

	let body: PostChatRequest;
	try {
		const raw = await req.json();
		const result = ChatRequestSchema.safeParse(raw);
		if (!result.success) {
			return jsonResponse(
				{ error: "Invalid request body", details: result.error.errors },
				{ status: 400 },
			);
		}
		body = result.data;
	} catch {
		return jsonResponse({ error: "Malformed JSON" }, { status: 400 });
	}

	// ---- generate all fast path (no user_message) ---------------------
	if (!body.user_message) {
		return handleGenerateAll(session.user.id, body.draft, body.variety);
	}

	return handleChat(session.user.id, body);
}

// ==========================================
// generate_all path
// ==========================================

async function handleGenerateAll(
	userId: string,
	draft: PostChatRequest["draft"],
	variety?: PostChatRequest["variety"],
) {
	// Zod's z.record() always infers Record<string, ...>; the values are fully typed,
	// only the key type differs from the SlotKey template literal. Cast once here.
	const typedDraft = draft as Omit<MealPlanDraft, "undo_stack">;

	const [libraryRecipes, catalogRecipes, profileTargets] = await Promise.all([
		fetchLibraryRecipes(userId),
		fetchCatalogRecipes(),
		fetchProfileTargets(typedDraft.included_profile_ids),
	]);

	const candidates = deduplicateCandidates(libraryRecipes, catalogRecipes);
	const compiledPrefs = compilePreferences(typedDraft);

	const output = generateSlots({
		draft: typedDraft,
		compiled_prefs: compiledPrefs,
		candidates,
		profile_targets: profileTargets,
		variety,
	} satisfies GeneratorInput);

	return jsonResponse({
		updated_slots: output.updated_slots,
		preference_patch_stack: typedDraft.preference_patch_stack,
		interpretation_summary: "Generated all unlocked slots.",
		is_ambiguous: false,
	});
}

// ==========================================
// Chat path (interpret -> apply ops -> generate)
// ==========================================

async function handleChat(userId: string, body: PostChatRequest) {
	const { user_message, profiles, conversation_history } = body;
	// Zod's z.record() infers Record<string, ...>; values are fully typed, only key type differs.
	const draft = body.draft as Omit<MealPlanDraft, "undo_stack">;

	const validDraftDates = new Set(
		Object.values(draft.slots).map((s) => s.date),
	);

	const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

	const userTurn = `${user_message}

--- CURRENT DRAFT STATE ---
${buildDraftContext(draft, profiles ?? [])}`;

	const contents: Content[] = [
		...(conversation_history ?? []).map(
			(turn): Content => ({
				role: turn.role === "assistant" ? "model" : "user",
				parts: [{ text: turn.content }],
			}),
		),
		{ role: "user", parts: [{ text: userTurn }] },
	];

	let consecutiveEmptyRounds = 0;

	for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
		const response = await ai.models.generateContent({
			model: "gemini-2.5-flash-lite",
			contents,
			config: {
				systemInstruction: {
					role: "user",
					parts: [{ text: SYSTEM_PROMPT }],
				},
				tools: [
					{
						functionDeclarations:
							FUNCTION_DECLARATIONS as unknown as import("@google/genai").FunctionDeclaration[],
					},
				],
				maxOutputTokens: 32_000,
				temperature: 0.2,
				thinkingConfig: { thinkingBudget: 512 },
			},
		});

		const llmCandidate = response.candidates?.[0];
		const parts = (llmCandidate?.content?.parts ?? []).filter(
			(p) => !(p as { thought?: boolean }).thought,
		);

		if (parts.length > 0) {
			contents.push({ role: "model", parts });
		}

		const functionCallParts = parts.filter((p) => p.functionCall != null);
		const finishReason = llmCandidate?.finishReason as string | undefined;

		if (functionCallParts.length === 0) {
			if (finishReason === "MALFORMED_FUNCTION_CALL") {
				consecutiveEmptyRounds++;
				if (consecutiveEmptyRounds > 1) {
					return jsonResponse({
						updated_slots: {},
						preference_patch_stack: draft.preference_patch_stack,
						interpretation_summary:
							"I wasn't able to process that request. Please try rephrasing.",
						is_ambiguous: false,
					});
				}
				contents.push({
					role: "user",
					parts: [
						{
							text: "Your last function call could not be parsed (MALFORMED_FUNCTION_CALL). Please re-read the function schema and call the function again with a syntactically valid JSON payload.",
						},
					],
				});
				continue;
			}

			consecutiveEmptyRounds++;
			if (consecutiveEmptyRounds > 1 || round === MAX_TOOL_ROUNDS - 1) {
				return jsonResponse({
					updated_slots: {},
					preference_patch_stack: draft.preference_patch_stack,
					interpretation_summary:
						"I wasn't able to process that request. Please try rephrasing.",
					is_ambiguous: false,
				});
			}

			contents.push({
				role: "user",
				parts: [
					{
						text: "Please proceed and call output_operations now with the operations array. If you described any actions, those operations MUST be included in operations_json.",
					},
				],
			});
			continue;
		}

		consecutiveEmptyRounds = 0;

		const toolResultParts: Part[] = [];
		let shouldRetry = false;
		let finalResult: {
			updated_slots: Record<SlotKey, DraftSlot>;
			preference_patch_stack: PrefPatchOp[];
			interpretation_summary: string;
			is_ambiguous: boolean;
		} | null = null;

		for (const part of functionCallParts) {
			const call = part.functionCall!;

			if (call.name === "search_recipes") {
				const args = call.args as { queries: string[] };
				const results = await searchRecipes(userId, args.queries ?? []);
				toolResultParts.push({
					functionResponse: {
						name: "search_recipes",
						response: {
							results: results.map((r) => ({
								id: r.id,
								name: r.name,
								description: r.description ?? "",
							})),
							count: results.length,
							hint:
								results.length === 0
									? "No recipes matched. Try shorter or alternate queries."
									: undefined,
						},
					},
				});
			} else if (call.name === "output_operations") {
				const args = call.args as {
					operations_json: string;
					interpretation_summary: string;
					is_ambiguous: boolean;
				};

				let parsedOperations: unknown;
				try {
					parsedOperations = JSON.parse(args.operations_json ?? "[]");
				} catch (jsonErr) {
					toolResultParts.push({
						functionResponse: {
							name: "output_operations",
							response: {
								error:
									`operations_json could not be parsed as JSON: ${(jsonErr as Error).message}. ` +
									"Please call output_operations again with a syntactically valid JSON array.",
							},
						},
					});
					shouldRetry = true;
					break;
				}

				if (
					Array.isArray(parsedOperations) &&
					parsedOperations.length === 0 &&
					summaryImpliesActions(args.interpretation_summary)
				) {
					toolResultParts.push({
						functionResponse: {
							name: "output_operations",
							response: {
								error:
									"Your operations_json is empty but your interpretation_summary describes actions that must appear in operations_json. Call output_operations again and include those operations.",
							},
						},
					});
					shouldRetry = true;
					break;
				}

				const invalidRecipeIds = findInvalidRecipeIds(
					parsedOperations as unknown[],
				);
				if (invalidRecipeIds.length > 0) {
					toolResultParts.push({
						functionResponse: {
							name: "output_operations",
							response: {
								error:
									`Your operations contain invalid recipe_id value(s): ${invalidRecipeIds.map((r) => JSON.stringify(r)).join(", ")}. ` +
									"Every recipe_id MUST be a real UUID from the draft or returned by search_recipes. Call search_recipes then retry.",
							},
						},
					});
					shouldRetry = true;
					break;
				}

				const invalidDates = findInvalidDates(
					parsedOperations as unknown[],
					validDraftDates,
				);
				if (invalidDates.length > 0) {
					const validList = [...validDraftDates]
						.map((d) => `${d} (${dayOfWeekFromDate(d)})`)
						.join(", ");
					toolResultParts.push({
						functionResponse: {
							name: "output_operations",
							response: {
								error:
									`Your operations reference date(s) not present in the draft: ${invalidDates.join(", ")}. ` +
									`The only valid dates are: ${validList}. Call output_operations again using only dates from that list.`,
							},
						},
					});
					shouldRetry = true;
					break;
				}

				const finalValidation = InterpreterResponseSchema.safeParse({
					operations: parsedOperations,
					interpretation_summary: args.interpretation_summary,
					is_ambiguous: args.is_ambiguous,
				});

				if (!finalValidation.success) {
					return jsonResponse(
						{
							error: "output_operations args failed schema validation",
							details: finalValidation.error?.errors,
						},
						{ status: 500 },
					);
				}

				const enriched = await enrichExcludeIngredientFilters(
					finalValidation.data,
				);

				// Apply operations to the draft
				const { draft: updatedDraft, slotAssignments } = applyOperationsToDraft(
					draft,
					enriched.operations,
				);

				// Always regenerate all unlocked slots after applying operations
				const [libraryRecipes, catalogRecipes, profileTargets] =
					await Promise.all([
						fetchLibraryRecipes(userId),
						fetchCatalogRecipes(),
						fetchProfileTargets(updatedDraft.included_profile_ids),
					]);

				const candidates = deduplicateCandidates(
					libraryRecipes,
					catalogRecipes,
				);

				const compiledPrefs = compilePreferences(
					updatedDraft,
					undefined,
					slotAssignments,
				);

				const output = generateSlots({
					draft: updatedDraft,
					compiled_prefs: compiledPrefs,
					candidates,
					profile_targets: profileTargets,
				} satisfies GeneratorInput);

				finalResult = {
					updated_slots: {
						...updatedDraft.slots,
						...output.updated_slots,
					} as Record<SlotKey, DraftSlot>,
					preference_patch_stack: updatedDraft.preference_patch_stack,
					interpretation_summary: enriched.interpretation_summary,
					is_ambiguous: enriched.is_ambiguous,
				};
				break;
			}
		}

		if (finalResult) {
			return jsonResponse(finalResult);
		}

		if (shouldRetry) {
			contents.push({ role: "user", parts: toolResultParts });
			continue;
		}

		contents.push({ role: "user", parts: toolResultParts });
	}

	return jsonResponse(
		{
			error: `Chat endpoint did not complete within ${MAX_TOOL_ROUNDS} rounds`,
		},
		{ status: 500 },
	);
}
