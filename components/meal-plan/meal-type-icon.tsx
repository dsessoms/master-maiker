import { Apple, Egg, Hamburger, Salad } from "@/lib/icons";

import type { MealType } from "@/lib/schemas/meal-plans/generate/draft-schema";

export const MealTypeIcon = ({
	mealType,
	className,
}: {
	mealType: MealType;
	className?: string;
}) => {
	switch (mealType) {
		case "Breakfast":
			return <Egg className={className} />;
		case "Lunch":
			return <Hamburger className={className} />;
		case "Dinner":
			return <Salad className={className} />;
		case "Snack":
			return <Apple className={className} />;
	}
};
