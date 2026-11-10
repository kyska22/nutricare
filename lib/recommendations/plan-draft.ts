type Translate = (key: string, params?: Record<string, string | number>) => string;

export interface PlanDraftInput {
  goals: string[];
  bmiClass: string | null;
  age: number | null;
  allergies: string | null;
  preferences: string | null;
  translate: Translate;
}

export function generatePlanDraft({
  goals,
  bmiClass,
  age,
  allergies,
  preferences,
  translate,
}: PlanDraftInput) {
  if (age === null) {
    return {
      goalsAndPrescription: translate("planDraft.ageUnknownGoals"),
      mealPlan: translate("planDraft.ageUnknownPlan"),
      activityPlan: translate("planDraft.ageUnknownActivity"),
      recommendations: translate("planDraft.professionalReview"),
    };
  }

  if (age < 18) {
    return {
      goalsAndPrescription: translate("planDraft.pediatricGoals"),
      mealPlan: translate("planDraft.pediatricPlan"),
      activityPlan: translate("planDraft.pediatricActivity"),
      recommendations: translate("planDraft.professionalReview"),
    };
  }

  const weightLoss = goals.includes("weightLoss") || goals.includes("reduceBodyFat");
  const muscleGain = goals.includes("muscleGain");
  const bodyComposition = goals.includes("bodyComposition");
  const goalKey = weightLoss && muscleGain
    ? "weightAndMuscle"
    : weightLoss
      ? "weightLoss"
      : muscleGain
        ? "muscleGain"
        : bodyComposition
          ? "bodyComposition"
          : "general";
  const goalsAndPrescription = translate(`planDraft.goals.${goalKey}`);
  const bmiClassIII = bmiClass === "obesityIII";
  const mealParts = [
    translate("planDraft.mealFramework"),
    translate(`planDraft.mealGoals.${goalKey}`),
  ];
  if (preferences?.trim()) {
    mealParts.push(translate("planDraft.preferences", { preferences: preferences.trim() }));
  }
  if (allergies?.trim()) {
    mealParts.push(translate("planDraft.allergies", { allergies: allergies.trim() }));
  }
  const activityPlan = translate(bmiClassIII ? "planDraft.activityClassIII" : "planDraft.activityGradual");
  const recommendations = [
    translate("planDraft.supportiveRecommendation"),
    bmiClassIII ? translate("planDraft.classIIIReview") : "",
    translate("planDraft.professionalReview"),
  ].filter(Boolean).join("\n\n");

  return {
    goalsAndPrescription,
    mealPlan: mealParts.join("\n\n"),
    activityPlan,
    recommendations,
  };
}
