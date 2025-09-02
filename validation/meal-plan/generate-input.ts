import {
	AverageMealComplexityEnum,
	DietTypeEnum,
	MealSourceEnum,
	MealTypeEnum,
} from "./meal-plan";

import { z } from "zod";

export const GenerateMealPlanInputSchema = z.object({
	days: z.array(z.string().regex(/^\d{2}\/\d{2}\/\d{2}$/)),
	includedMeals: z.array(MealTypeEnum),
	prepOption: MealSourceEnum,
	dietaryPreferences: z.array(DietTypeEnum).optional(),
	ingredientLikes: z.array(z.string()).optional(),
	ingredientDislikes: z.array(z.string()).optional(),
	averageMealComplexity: AverageMealComplexityEnum,
});

export type GenerateMealPlanInput = z.infer<typeof GenerateMealPlanInputSchema>;
