import { add, startOfWeek, sub } from "date-fns";
import { createContext, useState } from "react";

interface MealPlanContextInterface {
  startDate: Date;
  endDate: Date;
  viewNext: () => void;
  viewPrevious: () => void;
  viewThisWeek: () => void;
  viewNextWeek: () => void;
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
};

export const MealPlanContext = createContext<MealPlanContextInterface>(
  INITIAL_MEAL_PLAN_CONTEXT
);

export const MealPlanContextProvider = ({ children }: { children: any }) => {
  const [startDate, setStartDate] = useState(getStartOfWeek());
  const endDate = add(startDate, { days: 6 });

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
      add(startOfWeek(new Date(), { weekStartsOn: 1 }), { weeks: 1 })
    );
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
      }}
    >
      {children}
    </MealPlanContext.Provider>
  );
};
