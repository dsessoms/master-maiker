import { createHmac } from "crypto";

import {
	ErrorResponse,
	FatSecretFoodSubCategories,
	FatSecretFoodType,
	FatSecretFoodSearchV2 as ParsedFatSecretFoodSearchV2,
	FatsecretGetResponse as ParsedFatsecretGetResponse,
} from "./types";
import axios, { AxiosResponse } from "axios";

import queryString from "query-string";

const API_PATH = process.env.FAT_SECRET_API_PATH;
const ACCESS_KEY = process.env.FAT_SECRET_ACCESS_KEY;
const APP_SECRET = process.env.FAT_SECRET_APP_SECRET;
const OAUTH_VERSION = "1.0";
const OAUTH_SIGNATURE_METHOD = "HMAC-SHA1";

interface FatsecretGetResponse {
	food: FatSecretFood;
	error: ErrorResponse;
}

interface FatSecretFoodSearchV2 {
	foods_search: FatSecretFoodsSearch;
	error: ErrorResponse;
}

interface FatSecretFoodsSearch {
	max_results: string;
	page_number: string;
	results: FatSecretResults | null;
	total_results: string;
}

interface FatSecretResults {
	food: FatSecretFood[];
}

interface FatSecretFood {
	brand_name: string | null;
	food_id: string;
	food_name: string;
	food_sub_categories?: FatSecretFoodSubCategories;
	food_type: FatSecretFoodType;
	food_url?: string;
	servings: FatSecretServings;
}

interface FatSecretServing {
	calories: string;
	carbohydrate: string;
	fat: string;
	protein: string;
	number_of_units: string;
	measurement_description: string;
	calcium?: string | null;
	cholesterol?: string | null;
	fiber?: string | null;
	iron?: string | null;
	is_default?: string | null;
	potassium?: string | null;
	saturated_fat?: string | null;
	serving_description: string;
	serving_id: string;
	serving_url: string | null;
	sodium?: string | null;
	sugar?: string | null;
	trans_fat?: string | null;
	monounsaturated_fat?: string | null;
	polyunsaturated_fat?: string | null;
	vitamin_a?: string | null;
	vitamin_c?: string | null;
	vitamin_d?: string | null;
}

interface FatSecretAutocompleteResponse {
	suggestions: {
		suggestion: string[] | string;
	};
}

interface FatSecretBarcodeResponse {
	food_id: { value: string };
}

interface FatSecretServings {
	serving: FatSecretServing[];
}

function getNumericFatSecretServing(serving: FatSecretServing) {
	return {
		...serving,
		serving_id: Number(serving.serving_id),
		calories: Number(serving.calories),
		carbohydrate: Number(serving.carbohydrate),
		fat: Number(serving.fat),
		protein: Number(serving.protein),
		number_of_units: Number(serving.number_of_units),
		calcium: serving.calcium ? Number(serving.calcium) : null,
		cholesterol: serving.cholesterol ? Number(serving.cholesterol) : null,
		fiber: serving.fiber ? Number(serving.fiber) : null,
		iron: serving.iron ? Number(serving.iron) : null,
		potassium: serving.potassium ? Number(serving.potassium) : null,
		saturated_fat: serving.saturated_fat ? Number(serving.saturated_fat) : null,
		sodium: serving.sodium ? Number(serving.sodium) : null,
		sugar: serving.sugar ? Number(serving.sugar) : null,
		trans_fat: serving.trans_fat ? Number(serving.trans_fat) : null,
		monounsaturated_fat: serving.monounsaturated_fat
			? Number(serving.monounsaturated_fat)
			: null,
		polyunsaturated_fat: serving.polyunsaturated_fat
			? Number(serving.polyunsaturated_fat)
			: null,
		vitamin_a: serving.vitamin_a ? Number(serving.vitamin_a) : null,
		vitamin_c: serving.vitamin_c ? Number(serving.vitamin_c) : null,
		vitamin_d: serving.vitamin_d ? Number(serving.vitamin_d) : null,
		is_default: serving.is_default ? Number(serving.is_default) : null,
	};
}

function getOauthParameters(): object {
	const timestamp = Math.round(new Date().getTime() / 1000);
	return {
		oauth_consumer_key: ACCESS_KEY,
		oauth_nonce: `${timestamp}${Math.floor(Math.random() * 1000)}`,
		oauth_signature_method: OAUTH_SIGNATURE_METHOD,
		oauth_timestamp: timestamp,
		oauth_version: OAUTH_VERSION,
	};
}

function getSignature(queryParams: object, httpMethod = "GET") {
	const signatureBaseString = [
		httpMethod,
		encodeURIComponent(API_PATH as string),
		encodeURIComponent(queryString.stringify(queryParams)),
	].join("&");
	const signatureKey = `${APP_SECRET}&`;
	return createHmac("sha1", signatureKey)
		.update(signatureBaseString)
		.digest("base64");
}

function makeApiCall(
	methodParams: object,
	httpMethod = "GET",
): Promise<AxiosResponse> {
	const queryParams: any = {
		...getOauthParameters(),
		...methodParams,
		format: "json",
	};
	queryParams.oauth_signature = getSignature(queryParams, httpMethod);
	return axios({
		method: httpMethod.toLowerCase() as any,
		url: `${API_PATH}?${queryString.stringify(queryParams)}`,
	});
}

export async function searchFoodV3(
	query: string,
	maxResults = 50,
	page_number = 0,
) {
	const methodParams = {
		method: "foods.search.v3",
		max_results: maxResults,
		search_expression: query,
		include_sub_categories: true,
		flag_default_serving: true,
		page_number,
	};
	const response = await makeApiCall(methodParams);
	const data = response.data as FatSecretFoodSearchV2;

	const parsedData: ParsedFatSecretFoodSearchV2 = {
		foods_search: {
			max_results: Number(data.foods_search.max_results),
			page_number: Number(data.foods_search.page_number),
			total_results: Number(data.foods_search.total_results),
			results: {
				food:
					data.foods_search.results?.food.map((food) => {
						return {
							...food,
							food_id: Number(food.food_id),
							servings: {
								serving: food.servings.serving.map((serving) =>
									getNumericFatSecretServing(serving),
								),
							},
						};
					}) ?? [],
			},
		},
		error: data.error,
	};
	return parsedData;
}

export async function findIdForBarcode(barcode: string) {
	const methodParams = {
		method: "food.find_id_for_barcode",
		barcode,
		format: "json",
	};
	const response = await makeApiCall(methodParams);
	return response.data as FatSecretBarcodeResponse;
}

export async function getFoodItem(id: string | number) {
	const methodParams = {
		method: "food.get.v3",
		food_id: id,
	};
	const response = await makeApiCall(methodParams);
	const data = response.data as FatsecretGetResponse;
	const parsedData: ParsedFatsecretGetResponse = {
		food: {
			...data.food,
			food_id: Number(data.food.food_id),
			servings: {
				serving: data.food.servings.serving.map((serving) =>
					getNumericFatSecretServing(serving),
				),
			},
		},
		error: data.error,
	};
	return parsedData;
}

export async function autocomplete(
	query: string,
	maxResults = 8,
): Promise<FatSecretAutocompleteResponse> {
	const methodParams = {
		method: "foods.autocomplete",
		max_results: maxResults,
		expression: query,
		format: "json",
	};
	const response = await makeApiCall(methodParams);
	return response.data as FatSecretAutocompleteResponse;
}
