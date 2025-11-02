import { add, startOfWeek, sub } from "date-fns";
import { createContext, useEffect, useState } from "react";

import { Profile } from "@/types";
import { useProfiles } from "@/hooks/profiles/useProfiles";

type SelectableProfile = Profile & {
	isSelected: boolean;
};

interface MealPlanContextInterface {
	startDate: Date;
	endDate: Date;
	viewNext: () => void;
	viewPrevious: () => void;
	viewThisWeek: () => void;
	viewNextWeek: () => void;
	selectableProfiles: SelectableProfile[];
	onProfileToggle: (profileId: string) => void;
	setSelectableProfiles: (profiles: SelectableProfile[]) => void;
	isLoadingProfiles: boolean;
}

function getStartOfWeek() {
	return startOfWeek(new Date(), { weekStartsOn: 1 });
}

const INITIAL_MEAL_PLAN_CONTEXT: MealPlanContextInterface = {
	startDate: getStartOfWeek(),
	endDate: add(getStartOfWeek(), { days: 6 }),
	viewNext: () => null,
	viewPrevious: () => null,
	viewThisWeek: () => null,
	viewNextWeek: () => null,
	selectableProfiles: [],
	onProfileToggle: () => null,
	setSelectableProfiles: () => null,
	isLoadingProfiles: false,
};

export const MealPlanContext = createContext<MealPlanContextInterface>(
	INITIAL_MEAL_PLAN_CONTEXT,
);

export const MealPlanContextProvider = ({ children }: { children: any }) => {
	const [startDate, setStartDate] = useState(getStartOfWeek());
	const endDate = add(startDate, { days: 6 });
	const [selectableProfiles, setSelectableProfiles] = useState<
		SelectableProfile[]
	>([]);

	// Fetch profiles
	const { profiles, isLoading: isLoadingProfiles } = useProfiles();

	// Auto-initialize selectable profiles when profiles are loaded
	useEffect(() => {
		setSelectableProfiles(
			profiles.map((profile) => ({ ...profile, isSelected: true })),
		);
	}, [profiles]);

	const viewNext = () => {
		setStartDate(add(startDate, { weeks: 1 }));
	};

	const viewPrevious = () => {
		setStartDate(sub(startDate, { weeks: 1 }));
	};

	const viewThisWeek = () => {
		setStartDate(startOfWeek(new Date(), { weekStartsOn: 1 }));
	};

	const viewNextWeek = () => {
		setStartDate(
			add(startOfWeek(new Date(), { weekStartsOn: 1 }), { weeks: 1 }),
		);
	};

	const onProfileToggle = (profileId: string) => {
		const newProfileArray = [...selectableProfiles];
		const profileIndex = newProfileArray.findIndex(
			(profile) => profile.id === profileId,
		);
		if (profileIndex >= 0) {
			newProfileArray[profileIndex].isSelected =
				!newProfileArray[profileIndex].isSelected;
			setSelectableProfiles(newProfileArray);
		}
	};

	return (
		<MealPlanContext.Provider
			value={{
				startDate,
				endDate,
				viewNext,
				viewPrevious,
				viewThisWeek,
				viewNextWeek,
				selectableProfiles,
				onProfileToggle,
				setSelectableProfiles,
				isLoadingProfiles,
			}}
		>
			{children}
		</MealPlanContext.Provider>
	);
};
