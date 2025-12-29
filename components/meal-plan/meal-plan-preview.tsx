import { eachDayOfInterval, format } from "date-fns";

import { GeneratedMealPlan } from "@/lib/schemas";
import { Profile } from "@/types";
import { ProfileAvatar } from "@/components/profile-avatar";
import { Text } from "@/components/ui/text";
import { View } from "react-native";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import { useRecipes } from "@/hooks/recipes/use-recipes";

type ProfileWithAvatar = Profile & {
	avatar_url?: string;
};

export const MealPlanPreview = ({
	startDate,
	endDate,
	mealPlan,
	profiles,
}: {
	startDate: string;
	endDate: string;
	mealPlan: GeneratedMealPlan;
	profiles?: ProfileWithAvatar[];
}) => {
	const { recipes } = useRecipes();

	const weekDates = useMemo(
		() =>
			eachDayOfInterval({
				start: startDate,
				end: endDate,
			}),
		[startDate, endDate],
	);

	// Create a map of recipe IDs to the dates they appear on with profile info
	const recipeSchedule = useMemo(() => {
		const schedule: {
			[recipeId: string]: {
				[dateString: string]: string[]; // array of profile IDs
			};
		} = {};

		mealPlan.foodEntries?.forEach((entry) => {
			const dateString =
				typeof entry.date === "string"
					? entry.date
					: format(new Date(entry.date), "yyyy-MM-dd");

			if (!schedule[entry.recipe_id]) {
				schedule[entry.recipe_id] = {};
			}

			// Get profile IDs from profile_servings (array of [profileId, servings] pairs)
			const profileIds = Array.isArray(entry.profile_servings)
				? entry.profile_servings.map((pair) => pair[0] as string)
				: [];
			schedule[entry.recipe_id][dateString] = profileIds;
		});

		return schedule;
	}, [mealPlan.foodEntries]);

	// Get unique recipes from the meal plan
	const uniqueRecipes = useMemo(() => {
		const recipeMap = new Map();

		mealPlan.foodEntries?.forEach((entry) => {
			if (!recipeMap.has(entry.recipe_id)) {
				const recipe = mealPlan.recipes.find((r) => r.id === entry.recipe_id);
				const recipeName =
					recipe?.name ||
					recipes?.find((savedRecipe) => savedRecipe.id === entry.recipe_id)
						?.name;

				if (recipeName) {
					recipeMap.set(entry.recipe_id, {
						id: entry.recipe_id,
						name: recipeName,
					});
				}
			}
		});

		return Array.from(recipeMap.values());
	}, [mealPlan, recipes]);

	return (
		<View>
			{/* Header Row */}
			<View className="flex-row">
				<View className="flex-1">
					{/* Empty space for recipe column header */}
				</View>
				<View className="flex-row">
					{weekDates.map((date, idx) => (
						<View
							key={date.toISOString()}
							className={cn(
								"w-12 items-center py-2 border-b border-gray-200",
								idx % 2 === 0 ? "bg-slate-100" : "bg-white",
							)}
						>
							<Text className="text-xs font-semibold text-gray-500">
								{format(date, "EEE").charAt(0)}
							</Text>
						</View>
					))}
				</View>
			</View>

			{/* Recipe Rows */}
			{uniqueRecipes.map((recipe) => {
				const scheduledDates = recipeSchedule[recipe.id];

				return (
					<View key={recipe.id} className="flex-row">
						{/* Recipe Info */}
						<View className="flex-1 flex-row items-center gap-2 py-3 pr-2">
							<Text className="text-sm flex-1" numberOfLines={2}>
								{recipe.name}
							</Text>
						</View>

						{/* Day Indicators */}
						<View className="flex-row">
							{weekDates.map((date, idx) => {
								const dateString = format(date, "yyyy-MM-dd");
								const profileIds = scheduledDates?.[dateString] || [];
								const scheduledProfiles =
									profiles?.filter((p) => profileIds.includes(p.id)) || [];

								return (
									<View
										key={dateString}
										className={cn(
											"w-12 items-center justify-center py-3 self-stretch",
											idx % 2 === 0 ? "bg-slate-100" : "bg-white",
										)}
									>
										{scheduledProfiles.length > 0 && (
											<View className="flex flex-row">
												{scheduledProfiles.slice(0, 2).map((profile, pIdx) => (
													<ProfileAvatar
														key={profile.id}
														name={profile.name}
														avatarUrl={profile.avatar_url}
														alt={`${profile.name}'s Avatar`}
														className={cn(
															"h-5 w-5 border border-white",
															pIdx !== 0 && "-ml-2",
														)}
													/>
												))}
												{scheduledProfiles.length > 2 && (
													<ProfileAvatar
														name={`+${scheduledProfiles.length - 2}`}
														alt="plus more profiles"
														className="h-5 w-5 border border-white -ml-2"
													/>
												)}
											</View>
										)}
									</View>
								);
							})}
						</View>
					</View>
				);
			})}
		</View>
	);
};
