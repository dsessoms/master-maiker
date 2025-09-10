import { Database } from "@/database.types";
import { FatSecretFood } from "./types";
import { createClient } from "@supabase/supabase-js";

const serviceRoleSecret = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

// export async function storeFatSecretFoods(
// 	fatSecretFoods: { fsFood: FatSecretFood; fsServingId: string | number }[],
// ) {
// 	const adminSupabase = createClient<Database>(
// 		supabaseUrl!,
// 		serviceRoleSecret!,
// 		{
// 			auth: {
// 				persistSession: false,
// 				autoRefreshToken: false,
// 				detectSessionInUrl: false,
// 			},
// 		},
// 	);
// 	const storedFood = await Promise.all(
// 		fatSecretFoods.map(async ({ fsFood, fsServingId: selectedServingId }) => {
// 			const { data: foodRow } = await adminSupabase
// 				.from("food")
// 				.upsert(
// 					{
// 						fat_secret_id: fsFood.food_id,
// 						food_name: fsFood.food_name,
// 						brand_name: fsFood.brand_name,
// 						food_type: fsFood.food_type,
// 					},
// 					{ onConflict: "fat_secret_id" },
// 				)
// 				.select()
// 				.throwOnError();

// 			const foodId = foodRow?.[0].id;

// 			if (!foodId) {
// 				throw new Error("failed to save fat secret food");
// 			}

// 			const servings = Array.isArray(fsFood.servings.serving)
// 				? fsFood.servings.serving
// 				: [fsFood.servings.serving];

// 			await Promise.all(
// 				servings.map(async (serving) => {
// 					return await adminSupabase
// 						.from("serving")
// 						.upsert(
// 							{
// 								fat_secret_id: serving.serving_id,
// 								food_id: foodId,
// 								serving_description: serving.serving_description,
// 								measurement_description: serving.measurement_description,
// 								number_of_units: serving.number_of_units,
// 								calories: serving.calories,
// 								carbohydrate: serving.carbohydrate,
// 								fat: serving.fat,
// 								protein: serving.protein,
// 								fiber: serving.fiber,
// 								sugar: serving.sugar,
// 								sodium: serving.sodium,
// 								is_default: serving.is_default,
// 							},
// 							{ onConflict: "fat_secret_id" },
// 						)
// 						.throwOnError();
// 				}),
// 			);

// 			return adminSupabase
// 				.from("food")
// 				.select(
// 					`
//           id,
//           fat_secret_id,
//           food_name,
//           brand_name,
//           food_type,
//           serving (id)
//           `,
// 				)
// 				.eq("id", foodId)
// 				.eq("serving.fat_secret_id", selectedServingId)
// 				.single()
// 				.throwOnError();
// 		}),
// 	);

// 	const foodMap: {
// 		[fatSecretId: string]: { food_id: string; serving_id: string };
// 	} = {};
// 	for (const { data } of storedFood) {
// 		const nonNullData = data as NonNullable<typeof data>;
// 		foodMap[nonNullData.fat_secret_id] = {
// 			food_id: nonNullData.id,
// 			serving_id: nonNullData.serving[0].id,
// 		};
// 	}
// 	return foodMap;
// }
