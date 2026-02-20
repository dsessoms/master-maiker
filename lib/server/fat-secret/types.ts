export interface FatSecretFoodSearchV2 {
	foods_search: FatSecretFoodsSearch;
	error: ErrorResponse;
}

export interface FatSecretFoodsSearch {
	max_results: number;
	page_number: number;
	results: FatSecretResults;
	total_results: number;
}

export interface FatSecretResults {
	food: FatSecretFood[];
}

export interface FatSecretFoodImage {
	image_url: string;
	image_type: string;
}

export interface FatSecretFoodImages {
	food_image: FatSecretFoodImage[];
}

export interface FatSecretFood {
	brand_name: string | null;
	food_id: number;
	food_name: string;
	food_sub_categories?: FatSecretFoodSubCategories;
	food_type: FatSecretFoodType;
	food_url?: string;
	food_images?: FatSecretFoodImages;
	thumbnail_image_url?: string;
	servings: FatSecretServings;
}

export interface FatSecretServings {
	serving: FatSecretServing[];
}

export interface FatSecretServing {
	calories: number;
	carbohydrate: number;
	fat: number;
	protein: number;
	number_of_units: number;
	measurement_description: string;
	calcium: number | null;
	cholesterol: number | null;
	fiber: number | null;
	iron: number | null;
	is_default: number | null;
	potassium: number | null;
	saturated_fat: number | null;
	serving_description: string;
	serving_id: number;
	serving_url: string | null;
	sodium: number | null;
	sugar: number | null;
	trans_fat: number | null;
	monounsaturated_fat: number | null;
	polyunsaturated_fat: number | null;
	vitamin_a: number | null;
	vitamin_c: number | null;
	vitamin_d: number | null;
}

export interface FatsecretGetResponse {
	food: FatSecretFood;
	error: ErrorResponse;
}

export interface ErrorResponse {
	code: number;
	message: string;
}

export type FatSecretFoodType = "Brand" | "Generic";

export interface FatSecretFoodSubCategories {
	food_sub_category: string[];
}
