export const menuMeals = [
  "breakfast",
  "morningSnack",
  "lunch",
  "afternoonSnack",
  "dinner",
] as const;

export type MenuMeal = (typeof menuMeals)[number];
export type TwoWeekMenu = Record<string, Partial<Record<MenuMeal, string>>>;

export const menuDays = Array.from({ length: 14 }, (_, index) => `day${index + 1}`);

export function emptyTwoWeekMenu(): TwoWeekMenu {
  return Object.fromEntries(menuDays.map((day) => [day, {}]));
}

export function normalizeTwoWeekMenu(value: unknown): TwoWeekMenu {
  const result = emptyTwoWeekMenu();
  if (!value || typeof value !== "object" || Array.isArray(value)) return result;
  for (const day of menuDays) {
    const valueForDay = (value as Record<string, unknown>)[day];
    if (!valueForDay || typeof valueForDay !== "object" || Array.isArray(valueForDay)) continue;
    for (const meal of menuMeals) {
      const mealValue = (valueForDay as Record<string, unknown>)[meal];
      if (typeof mealValue === "string") result[day][meal] = mealValue;
    }
  }
  return result;
}
