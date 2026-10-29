"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { menuDays, menuMeals, MenuMeal, TwoWeekMenu } from "@/lib/reports/two-week-menu";

export function TwoWeekMenuSection({
  value,
  editing = false,
  onChange,
  missingText,
}: {
  value: TwoWeekMenu;
  editing?: boolean;
  onChange?: (value: TwoWeekMenu) => void;
  missingText: string;
}) {
  const { t } = useI18n();
  const [selectedMeal, setSelectedMeal] = useState<MenuMeal>("breakfast");
  const [selectedDay, setSelectedDay] = useState("day1");
  const title = t("nutritionReport.sections.menuPlan");

  const updateMeal = (day: string, meal: MenuMeal, text: string) => {
    onChange?.({ ...value, [day]: { ...value[day], [meal]: text } });
  };
  const hasMenuItems = menuDays.some((day) => menuMeals.some((meal) => value[day]?.[meal]?.trim()));

  return (
    <section className="nutrition-plan-section rounded-3xl border border-emerald-100 bg-white p-5 shadow-lg shadow-emerald-950/5 sm:p-6 lg:col-span-2">
      <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.14em] text-emerald-800">{title}</h2>
      {editing ? (
        <>
          <div className="menu-plan-filters mb-5 flex flex-wrap gap-2">
            {menuDays.map((day, index) => (
              <button key={day} type="button" onClick={() => setSelectedDay(day)} aria-pressed={selectedDay === day} className={`rounded-full px-3 py-2 text-sm font-bold ${selectedDay === day ? "bg-orange-500 text-white" : "bg-emerald-50 text-emerald-900"}`}>
                {t("nutritionReport.menu.day", { count: index + 1 })}
              </button>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {menuMeals.map((meal) => (
              <label key={meal} className="block">
                <span className="text-sm font-bold text-emerald-950">{t(`nutritionReport.menu.meals.${meal}`)}</span>
                <textarea value={value[selectedDay]?.[meal] ?? ""} onChange={(event) => updateMeal(selectedDay, meal, event.target.value)} rows={3} placeholder={t("nutritionReport.menu.portionPlaceholder")} className="mt-2 min-h-24 w-full resize-y rounded-xl border border-emerald-950/15 bg-emerald-50/30 px-4 py-3 text-sm leading-6 text-emerald-950 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100" />
                <span className="print-only mt-2 hidden whitespace-pre-wrap text-sm leading-6 text-emerald-950">{value[selectedDay]?.[meal] || missingText}</span>
              </label>
            ))}
          </div>
          <p className="mt-4 text-xs leading-5 text-slate-500">{t("nutritionReport.menu.portionHelp")}</p>
          <div className="print-only mt-6 hidden space-y-5">
            {hasMenuItems ? menuDays.filter((day) => menuMeals.some((meal) => value[day]?.[meal]?.trim())).map((day) => {
              const index = Number(day.slice(3)) - 1;
              return (
              <section key={day} className="menu-print-day break-inside-avoid border-t border-emerald-900/15 pt-4">
                <h3 className="font-bold text-emerald-950">{t("nutritionReport.menu.day", { count: index + 1 })}</h3>
                <dl className="mt-2 grid grid-cols-2 gap-3">
                  {menuMeals.map((meal) => (
                    <div key={meal}>
                      <dt className="text-xs font-bold text-emerald-800">{t(`nutritionReport.menu.meals.${meal}`)}</dt>
                      <dd className="mt-1 whitespace-pre-wrap text-sm leading-5 text-emerald-950">{value[day]?.[meal] || missingText}</dd>
                    </div>
                  ))}
                </dl>
              </section>
              );
            }) : <p>{missingText}</p>}
          </div>
        </>
      ) : (
        <>
          <label className="menu-plan-filters mb-4 block max-w-sm text-sm font-bold text-emerald-950">
            {t("nutritionReport.menu.selectMeal")}
            <select value={selectedMeal} onChange={(event) => setSelectedMeal(event.target.value as MenuMeal)} className="mt-2 min-h-11 w-full rounded-xl border border-emerald-950/15 bg-white px-4 py-2 text-emerald-950">
              {menuMeals.map((meal) => <option key={meal} value={meal}>{t(`nutritionReport.menu.meals.${meal}`)}</option>)}
            </select>
          </label>
          <div className="menu-selected-meal space-y-3">
            {menuDays.some((day) => value[day]?.[selectedMeal]?.trim()) ? menuDays.filter((day) => value[day]?.[selectedMeal]?.trim()).map((day) => {
              const index = Number(day.slice(3)) - 1;
              return (
              <div key={day} className="rounded-xl bg-emerald-50/70 p-4">
                <h3 className="text-sm font-bold text-emerald-800">{t("nutritionReport.menu.day", { count: index + 1 })}</h3>
                <p className="mt-1 whitespace-pre-wrap leading-6 text-emerald-950">{value[day]?.[selectedMeal] || missingText}</p>
              </div>
              );
            }) : <p className="rounded-xl bg-emerald-50/70 p-4 text-slate-600">{missingText}</p>}
          </div>
          <div className="menu-print-full hidden space-y-5">
            {hasMenuItems ? menuDays.filter((day) => menuMeals.some((meal) => value[day]?.[meal]?.trim())).map((day) => {
              const index = Number(day.slice(3)) - 1;
              return (
              <section key={day} className="menu-print-day break-inside-avoid border-t border-emerald-900/15 pt-4">
                <h3 className="font-bold text-emerald-950">{t("nutritionReport.menu.day", { count: index + 1 })}</h3>
                <dl className="mt-2 grid grid-cols-2 gap-3">
                  {menuMeals.map((meal) => (
                    <div key={meal}>
                      <dt className="text-xs font-bold text-emerald-800">{t(`nutritionReport.menu.meals.${meal}`)}</dt>
                      <dd className="mt-1 whitespace-pre-wrap text-sm leading-5 text-emerald-950">{value[day]?.[meal] || missingText}</dd>
                    </div>
                  ))}
                </dl>
              </section>
              );
            }) : <p>{missingText}</p>}
          </div>
        </>
      )}
    </section>
  );
}
