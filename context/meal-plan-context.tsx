import { add, format, startOfWeek, sub } from "date-fns";
import { createContext, useEffect, useMemo, useState } from "react";

import { GetFoodEntriesResponse } from "@/app/api/food-entries/index+api";
import { Note } from "@/lib/schemas/note-schema";
import { Profile } from "@/types";
import { useFoodEntries } from "@/hooks/recipes/use-food-entries";
import { useNotes } from "@/hooks/notes/use-notes";
import { useProfiles } from "@/hooks/profiles/useProfiles";

type SelectableProfile = Profile & {
	isSelected: boolean;
	avatar_url?: string;
};

// Note action for triggering note creation
interface AddNoteAction {
	date: string;
	mealType: "Breakfast" | "Lunch" | "Dinner" | "Snack";
}

type FoodEntry = GetFoodEntriesResponse["foodEntries"][0];

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
	selectedProfileIds: Set<string>;
	isLoadingProfiles: boolean;
	// Food entries
	foodEntries: FoodEntry[];
	foodEntriesByDay: { [key: string]: FoodEntry[] };
	isLoadingFoodEntries: boolean;
	// Notes
	notes: Note[];
	notesByDayAndMeal: { [key: string]: Note[] };
	isLoadingNotes: boolean;
	// Notes modal
	notesModalState: AddNoteAction | null;
	openNotesModal: (
		date: string,
		mealType: "Breakfast" | "Lunch" | "Dinner" | "Snack",
	) => void;
	closeNotesModal: () => void;
	// Generate meal plan modal
	generateMealPlanModalOpen: boolean;
	openGenerateMealPlanModal: () => void;
	closeGenerateMealPlanModal: () => void;
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
	selectedProfileIds: new Set(),
	onProfileToggle: () => null,
	setSelectableProfiles: () => null,
	isLoadingProfiles: false,
	foodEntries: [],
	foodEntriesByDay: {},
	isLoadingFoodEntries: false,
	notes: [],
	notesByDayAndMeal: {},
	isLoadingNotes: false,
	notesModalState: null,
	openNotesModal: () => null,
	closeNotesModal: () => null,
	generateMealPlanModalOpen: false,
	openGenerateMealPlanModal: () => null,
	closeGenerateMealPlanModal: () => null,
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
	const [addNoteAction, setAddNoteAction] = useState<AddNoteAction | null>(
		null,
	);
	const [generateMealPlanModalOpen, setGenerateMealPlanModalOpen] =
		useState(false);

	// Fetch profiles
	const { profiles, isLoading: isLoadingProfiles } = useProfiles();

	// Fetch food entries
	const { foodEntries = [], isLoading: isLoadingFoodEntries } = useFoodEntries(
		startDate,
		endDate,
	);

	// Fetch notes for the date range
	const { notes = [], isLoading: isLoadingNotes } = useNotes({
		noteType: "day_meal",
		startDate: format(startDate, "yyyy-MM-dd"),
		endDate: format(endDate, "yyyy-MM-dd"),
	});

	// Memoize food entries by day
	const foodEntriesByDay = useMemo(() => {
		const finalMap: { [key: string]: typeof foodEntries } = {};
		foodEntries?.forEach((entry) => {
			const dateString =
				typeof entry.date === "string"
					? entry.date
					: format(new Date(entry.date), "yyyy-MM-dd");
			if (finalMap[dateString]) {
				finalMap[dateString].push(entry);
			} else {
				finalMap[dateString] = [entry];
			}
		});
		return finalMap;
	}, [foodEntries]);

	// Memoize notes by day and meal type
	const notesByDayAndMeal = useMemo(() => {
		const finalMap: { [key: string]: typeof notes } = {};
		notes?.forEach((note) => {
			if (note.date && note.meal_type) {
				const key = `${note.date}-${note.meal_type}`;
				if (finalMap[key]) {
					finalMap[key].push(note);
				} else {
					finalMap[key] = [note];
				}
			}
		});
		return finalMap;
	}, [notes]);

	// Auto-initialize selectable profiles when profiles are loaded
	useEffect(() => {
		setSelectableProfiles(
			profiles.map((profile) => ({ ...profile, isSelected: true })),
		);
	}, [profiles]);

	const selectedProfileIds = useMemo(
		() =>
			new Set(
				selectableProfiles
					.filter((p: any) => p.isSelected)
					.map((p: any) => p.id),
			),
		[selectableProfiles],
	);

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

	const openNotesModal = (
		date: string,
		mealType: "Breakfast" | "Lunch" | "Dinner" | "Snack",
	) => {
		setAddNoteAction({ date, mealType });
	};

	const closeNotesModal = () => {
		setAddNoteAction(null);
	};

	const openGenerateMealPlanModal = () => {
		setGenerateMealPlanModalOpen(true);
	};

	const closeGenerateMealPlanModal = () => {
		setGenerateMealPlanModalOpen(false);
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
				selectedProfileIds,
				onProfileToggle,
				setSelectableProfiles,
				isLoadingProfiles,
				foodEntries,
				foodEntriesByDay,
				isLoadingFoodEntries,
				notes,
				notesByDayAndMeal,
				isLoadingNotes,
				notesModalState: addNoteAction,
				openNotesModal,
				closeNotesModal,
				generateMealPlanModalOpen,
				openGenerateMealPlanModal,
				closeGenerateMealPlanModal,
			}}
		>
			{children}
		</MealPlanContext.Provider>
	);
};
