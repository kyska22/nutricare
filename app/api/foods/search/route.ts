import { NextResponse } from "next/server";

type FdcFood = {
  fdcId: number;
  description: string;
  dataType?: string;
  foodNutrients?: Array<{ nutrientName?: string; unitName?: string; value?: number }>;
};

const commonFoods = [
  { id: -1, name: "Arroz blanco cocido", kcalPer100g: 130 },
  { id: -2, name: "Arroz integral cocido", kcalPer100g: 123 },
  { id: -3, name: "Arroz con vegetales", kcalPer100g: 140 },
  { id: -4, name: "Arroz con leche", kcalPer100g: 111 },
  { id: -5, name: "Arroz cocido", kcalPer100g: 130 },
  { id: -6, name: "Pechuga de pollo cocida", kcalPer100g: 165 },
  { id: -7, name: "Huevo cocido", kcalPer100g: 155 },
  { id: -8, name: "Frijoles cocidos", kcalPer100g: 127 },
  { id: -9, name: "Papa cocida", kcalPer100g: 87 },
  { id: -10, name: "Banana", kcalPer100g: 89 },
  { id: -11, name: "Manzana", kcalPer100g: 52 },
  { id: -12, name: "Avena cocida", kcalPer100g: 71 },
  { id: -13, name: "Pan blanco", kcalPer100g: 266 },
  { id: -14, name: "Leche entera", kcalPer100g: 61 },
  { id: -15, name: "Pasta cocida", kcalPer100g: 158 },
  { id: -16, name: "Carne de res cocida", kcalPer100g: 250 },
  { id: -17, name: "Salmón cocido", kcalPer100g: 206 },
  { id: -18, name: "Aguacate", kcalPer100g: 160 },
  { id: -19, name: "Tomate", kcalPer100g: 18 },
  { id: -20, name: "Yogur natural", kcalPer100g: 61 },
];

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2 || query.length > 100) return NextResponse.json({ foods: [] });
  const normalized = query.toLocaleLowerCase();
  const commonMatches = commonFoods.filter((food) => food.name.toLocaleLowerCase().includes(normalized));
  if (commonMatches.length >= 4) return NextResponse.json({ foods: commonMatches.slice(0, 8) });
  const key = process.env.FDC_API_KEY || "DEMO_KEY";
  try {
    const response = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, pageSize: 8, dataType: ["Foundation", "SR Legacy", "Survey (FNDDS)"] }),
      next: { revalidate: 3600 },
    });
    if (!response.ok) return NextResponse.json({ foods: commonMatches.slice(0, 8) });
    const result = await response.json() as { foods?: FdcFood[] };
    const foods = (result.foods ?? []).flatMap((food) => {
      if (/restaurant|fast food|latin american style restaurant/i.test(food.description)) return [];
      const energy = food.foodNutrients?.find((nutrient) => nutrient.nutrientName?.toLowerCase() === "energy" && nutrient.unitName?.toUpperCase() === "KCAL")?.value;
      return typeof energy === "number" && Number.isFinite(energy) && energy >= 0
        ? [{ id: food.fdcId, name: food.description, kcalPer100g: energy }]
        : [];
    });
    const unique = new Set(commonMatches.map((food) => food.name.toLocaleLowerCase()));
    return NextResponse.json({ foods: [...commonMatches, ...foods.filter((food) => !unique.has(food.name.toLocaleLowerCase()))].slice(0, 8) });
  } catch {
    return NextResponse.json({ foods: commonMatches.slice(0, 8) });
  }
}
