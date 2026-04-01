#!/usr/bin/env node
/**
 * Import catalog recipes from a JSONL file into Supabase.
 *
 * Each line in the JSONL file is a recipe object produced by the scraping /
 * analysis pipeline.  The script calls the `add_recipe` RPC (source='catalog')
 * which handles the full food → serving → ingredient → instruction chain, then
 * separately upserts `catalog_recipe_meta`.  It is idempotent: re-running with
 * the same file will look up the existing recipe by `source_url` and pass its
 * ID to `add_recipe`, which will delete+re-insert all child rows.
 *
 * Usage:
 *   npx tsx scripts/node/supabase-import.ts recipes.jsonl
 *   npx tsx scripts/node/supabase-import.ts recipes.jsonl --dry-run
 *   npx tsx scripts/node/supabase-import.ts recipes.jsonl --max-recipes 10
 *
 * Required env vars (loaded automatically from .env.local):
 *   EXPO_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { Database, Json } from "../../database.types";
import {
	SpoonacularRecipeResponse,
	convertSpoonacularRecipeToRecipe,
} from "../../lib/server/spoonacular/spoonacular-helper";
import { SupabaseClient, createClient } from "@supabase/supabase-js";

import { Recipe } from "../../lib/schemas/recipes/recipe-schema";
import fs from "fs";
import path from "path";
import readline from "readline";

// ---------------------------------------------------------------------------
// Env loading – mirrors what the Python script does
// ---------------------------------------------------------------------------
const envFile = path.resolve(__dirname, "../../.env.local");
if (fs.existsSync(envFile)) {
	for (const line of fs.readFileSync(envFile, "utf8").split("\n")) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
		const eqIdx = trimmed.indexOf("=");
		const key = trimmed.slice(0, eqIdx).trim();
		const value = trimmed.slice(eqIdx + 1).trim();
		if (!(key in process.env)) process.env[key] = value;
	}
}

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
	console.error(
		"Error: EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local",
	);
	process.exit(1);
}

const supabase: SupabaseClient<Database> = createClient<Database>(
	SUPABASE_URL,
	SUPABASE_SERVICE_ROLE_KEY,
	{ auth: { autoRefreshToken: false, persistSession: false } },
);

// ---------------------------------------------------------------------------
// Inlined from lib/server/recipe-helpers.ts — avoids importing supabase-server
// which calls createClient at module load time before env vars are populated.
// ---------------------------------------------------------------------------
function mapRecipeToRpcParams(recipe: Recipe, recipeId?: string) {
	return {
		...(recipeId && { recipe_id: recipeId }),
		recipe_name: recipe.name,
		number_of_servings: Number(recipe.servings),
		description: recipe.description ?? undefined,
		prep_time_hours: recipe.prep_time_hours
			? Number(recipe.prep_time_hours)
			: undefined,
		prep_time_minutes: recipe.prep_time_minutes
			? Number(recipe.prep_time_minutes)
			: undefined,
		cook_time_hours: recipe.cook_time_hours
			? Number(recipe.cook_time_hours)
			: undefined,
		cook_time_minutes: recipe.cook_time_minutes
			? Number(recipe.cook_time_minutes)
			: undefined,
		image_id: recipe.image_id ?? undefined,
		instructions: recipe.instructions ?? [],
		ingredients: recipe.ingredients as Json[],
		source_url: recipe.source_url ?? undefined,
		cuisine_ids: recipe.cuisine_ids ?? undefined,
		diet_ids: recipe.diet_ids ?? undefined,
		dish_type_ids: recipe.dish_type_ids ?? undefined,
		tag_names: recipe.tag_names ?? undefined,
	};
}

// ---------------------------------------------------------------------------
// Types that describe the JSONL input shape
// ---------------------------------------------------------------------------

interface LlmClassification {
	id: number;
	name: string;
}

interface LlmData {
	cuisines?: LlmClassification[];
	diets?: LlmClassification[];
	dish_types?: LlmClassification[];
}

interface RecipeStatus {
	scraped?: boolean;
	analyzed?: boolean;
}

interface JsonlRecipe {
	url: string;
	status?: RecipeStatus;
	error?: string;
	raw_data?: {
		title?: string;
		description?: string;
		prep_time?: number;
		cook_time?: number;
	};
	spoonacular_data?: SpoonacularRecipeResponse;
	llm_data?: LlmData;
}

// ---------------------------------------------------------------------------
// Transform
// ---------------------------------------------------------------------------

async function transformRecipe(
	jsonlRecipe: JsonlRecipe,
): Promise<Recipe | null> {
	if (!jsonlRecipe.spoonacular_data) {
		console.log(`  ✗ Missing spoonacular_data – skipping ${jsonlRecipe.url}`);
		return null;
	}

	// convertSpoonacularRecipeToRecipe handles ingredients, instructions,
	// times, and classification ID resolution — exactly as the generate API does.
	const recipe = await convertSpoonacularRecipeToRecipe(
		jsonlRecipe.spoonacular_data,
	);

	// Spoonacular's /analyze endpoint often returns null for preparationMinutes
	// and cookingMinutes. Fall back to raw_data integers (already in minutes).
	const raw = jsonlRecipe.raw_data;
	if (raw) {
		const hasSpoonacularPrepTime =
			(recipe.prep_time_hours ?? 0) > 0 || (recipe.prep_time_minutes ?? 0) > 0;
		if (!hasSpoonacularPrepTime && raw.prep_time && raw.prep_time > 0) {
			recipe.prep_time_hours = Math.floor(raw.prep_time / 60) || undefined;
			recipe.prep_time_minutes = raw.prep_time % 60 || undefined;
		}

		const hasSpoonacularCookTime =
			(recipe.cook_time_hours ?? 0) > 0 || (recipe.cook_time_minutes ?? 0) > 0;
		if (!hasSpoonacularCookTime && raw.cook_time && raw.cook_time > 0) {
			recipe.cook_time_hours = Math.floor(raw.cook_time / 60) || undefined;
			recipe.cook_time_minutes = raw.cook_time % 60 || undefined;
		}
	}

	// LLM data has classification IDs already resolved from the DB — prefer
	// them over the Spoonacular string-based resolution done inside the helper.
	const llm = jsonlRecipe.llm_data;
	if (llm) {
		if (llm.cuisines && llm.cuisines.length > 0) {
			recipe.cuisine_ids = llm.cuisines.map((c) => c.id);
		}
		if (llm.diets && llm.diets.length > 0) {
			recipe.diet_ids = llm.diets.map((d) => d.id);
		}
		if (llm.dish_types && llm.dish_types.length > 0) {
			recipe.dish_type_ids = llm.dish_types.map((d) => d.id);
		}
	}

	if (jsonlRecipe.raw_data?.description) {
		recipe.description = jsonlRecipe.raw_data.description;
	}

	recipe.source_url = jsonlRecipe.url;

	return recipe;
}

// ---------------------------------------------------------------------------
// Import a single prepared recipe via add_recipe RPC
// ---------------------------------------------------------------------------

async function importRecipe(recipe: Recipe, sourceUrl: string): Promise<void> {
	// Look up an existing recipe by source_url so re-runs are idempotent.
	// add_recipe uses ON CONFLICT (id), so passing the same UUID on re-import
	// will delete+replace all child rows cleanly.
	const { data: existing } = await supabase
		.from("recipe")
		.select("id")
		.eq("source_url", sourceUrl)
		.eq("source", "catalog")
		.maybeSingle();

	const recipeId: string = existing?.id ?? crypto.randomUUID();

	// NOTE: The `source` param was added in migration 20260331215208.
	// Run `npm run gen-types:local` after applying that migration to update
	// database.types.ts and remove this cast.
	type AddRecipeFn = Database["public"]["Functions"]["add_recipe"];
	type AddRecipeArgs = AddRecipeFn extends { Args: infer A } ? A : never;
	type AddRecipeArgsWithSource = AddRecipeArgs & { source?: string };

	const rpcArgs: AddRecipeArgsWithSource = {
		...mapRecipeToRpcParams(recipe, recipeId),
		source_url: sourceUrl,
		source: "catalog",
	};

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const { error: rpcError } = await (
		supabase.rpc as (
			fn: string,
			args: AddRecipeArgsWithSource,
		) => ReturnType<typeof supabase.rpc>
	)("add_recipe", rpcArgs);

	if (rpcError) {
		throw new Error(
			`add_recipe RPC failed for "${recipe.name}": ${rpcError.message}`,
		);
	}
}

// ---------------------------------------------------------------------------
// JSONL reader
// ---------------------------------------------------------------------------

async function loadJsonl(filePath: string): Promise<JsonlRecipe[]> {
	const recipes: JsonlRecipe[] = [];
	const rl = readline.createInterface({
		input: fs.createReadStream(filePath),
		crlfDelay: Infinity,
	});

	let lineNum = 0;
	for await (const line of rl) {
		lineNum++;
		const trimmed = line.trim();
		if (!trimmed) continue;
		try {
			recipes.push(JSON.parse(trimmed) as JsonlRecipe);
		} catch (e) {
			console.warn(`Warning: Invalid JSON on line ${lineNum} – skipping`);
		}
	}

	return recipes;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function run(): Promise<void> {
	// Arg parsing
	const args = process.argv.slice(2);
	if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
		console.log(
			[
				"Usage: npx tsx scripts/node/supabase-import.ts <recipes.jsonl> [options]",
				"",
				"Options:",
				"  --dry-run          Validate and transform records without inserting",
				"  --max-recipes <n>  Only process the first N ready recipes",
				"  --help             Show this message",
			].join("\n"),
		);
		process.exit(0);
	}

	const jsonlPath = path.resolve(args[0]);
	const dryRun = args.includes("--dry-run");
	const maxIdx = args.indexOf("--max-recipes");
	const maxRecipes = maxIdx !== -1 ? parseInt(args[maxIdx + 1], 10) : null;

	if (!fs.existsSync(jsonlPath)) {
		console.error(`Error: File not found – ${jsonlPath}`);
		process.exit(1);
	}

	console.log(`Loading ${jsonlPath} …`);
	const all = await loadJsonl(jsonlPath);
	console.log(`Read ${all.length} total lines`);

	// Filter to ready recipes
	const ready = all.filter(
		(r) =>
			r.status?.scraped && r.status?.analyzed && r.error !== "Paywall" && r.url,
	);

	// De-duplicate by URL within the file
	const seenUrls = new Set<string>();
	const deduped: JsonlRecipe[] = [];
	let dupeCount = 0;
	for (const r of ready) {
		if (seenUrls.has(r.url)) {
			dupeCount++;
		} else {
			seenUrls.add(r.url);
			deduped.push(r);
		}
	}

	const toProcess = maxRecipes != null ? deduped.slice(0, maxRecipes) : deduped;

	console.log(
		`${toProcess.length} recipes ready for import` +
			(dupeCount > 0 ? ` (${dupeCount} duplicate URLs skipped)` : "") +
			(dryRun ? " – DRY RUN" : ""),
	);
	console.log("=".repeat(60));

	let successCount = 0;
	let skipCount = 0;
	let errorCount = 0;

	for (let i = 0; i < toProcess.length; i++) {
		const jsonlRecipe = toProcess[i];
		const label = `[${i + 1}/${toProcess.length}]`;

		let prepared: Recipe | null;
		try {
			prepared = await transformRecipe(jsonlRecipe);
		} catch (e) {
			console.error(`${label} ✗ Transform error for ${jsonlRecipe.url}: ${e}`);
			errorCount++;
			continue;
		}

		if (!prepared) {
			skipCount++;
			continue;
		}

		if (dryRun) {
			console.log(`${label} ✓ [dry-run] ${prepared.name}`);
			successCount++;
			continue;
		}

		try {
			await importRecipe(prepared, jsonlRecipe.url);
			console.log(`${label} ✓ ${prepared.name}`);
			successCount++;
		} catch (e) {
			console.error(`${label} ✗ ${prepared.name}: ${e}`);
			errorCount++;
		}
	}

	console.log("=".repeat(60));
	console.log("Import complete!");
	console.log(`✓ ${dryRun ? "Validated" : "Imported"}: ${successCount}`);
	if (skipCount > 0) console.log(`⊘ Skipped (invalid): ${skipCount}`);
	if (dupeCount > 0) console.log(`⊘ Skipped (duplicate URL): ${dupeCount}`);
	if (errorCount > 0) console.log(`✗ Errors: ${errorCount}`);
	console.log("=".repeat(60));
}

run().catch((e) => {
	console.error("Fatal:", e);
	process.exit(1);
});
