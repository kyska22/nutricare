import {
  activityLevels,
  bowelFrequencies,
  exerciseFrequencies,
  exerciseTypes,
  stoolColors,
  stoolConsistencies,
} from "@/types/nutrition-assessment";

export const formOptions = {
  activityLevels,
  exerciseTypes,
  exerciseFrequencies,
  bowelFrequencies,
  stoolConsistencies,
  stoolColors,
} as const;
