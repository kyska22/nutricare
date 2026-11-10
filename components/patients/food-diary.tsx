"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserAuthClient } from "@/lib/supabase-auth";
import { useI18n } from "@/lib/i18n/i18n-provider";

type Meal = "breakfast" | "lunch" | "dinner" | "snack";
type Entry = { id: string; eaten_on: string; meal_type: Meal; food_name: string; amount_g: number | null; kcal: number | null };
type Food = { id: number; name: string; kcalPer100g: number };
type DayTotal = { eaten_on: string; total_kcal: number };
const MEALS: Meal[] = ["breakfast", "lunch", "dinner", "snack"];
const dateString = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const dateToday = () => dateString(new Date());

function weekStart() {
  const start = new Date();
  start.setDate(start.getDate() - 6);
  return dateString(start);
}

export function FoodDiary() {
  const { t, locale } = useI18n();
  const [date, setDate] = useState(dateToday);
  const [meal, setMeal] = useState<Meal>("breakfast");
  const [query, setQuery] = useState("");
  const [foods, setFoods] = useState<Food[]>([]);
  const [selected, setSelected] = useState<Food | null>(null);
  const [grams, setGrams] = useState("100");
  const [items, setItems] = useState<Entry[]>([]);
  const [week, setWeek] = useState<DayTotal[]>([]);
  const [busy, setBusy] = useState(false);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState("");
  const supabase = useMemo(() => createSupabaseBrowserAuthClient(), []);
  const localeTag = locale === "es" ? "es-ES" : locale === "pt" ? "pt-BR" : "en-US";
  const amount = Number(grams);
  const estimatedKcal = selected && amount > 0 ? Math.round(selected.kcalPer100g * amount / 100) : 0;
  const todayTotal = items.reduce((sum, item) => sum + Number(item.kcal ?? 0), 0);
  const dayNames = [t("foodDiary.mon"), t("foodDiary.tue"), t("foodDiary.wed"), t("foodDiary.thu"), t("foodDiary.fri"), t("foodDiary.sat"), t("foodDiary.sun")];

  useEffect(() => {
    if (query.trim().length < 2 || selected) { setFoods([]); return; }
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setSearching(true);
      void fetch(`/api/foods/search?q=${encodeURIComponent(query.trim())}`, { signal: controller.signal })
        .then((response) => response.ok ? response.json() : Promise.reject())
        .then((result: { foods?: Food[] }) => setFoods(result.foods ?? []))
        .catch(() => { if (!controller.signal.aborted) setFoods([]); })
        .finally(() => { if (!controller.signal.aborted) setSearching(false); });
    }, 350);
    return () => { window.clearTimeout(timeout); controller.abort(); };
  }, [query, selected]);

  useEffect(() => {
    let active = true;
    if (!supabase) return;
    void Promise.all([
      supabase.rpc("get_patient_food_diary", { p_eaten_on: date }),
      supabase.rpc("get_patient_food_diary_week", { p_start: weekStart() }),
    ]).then(([daily, weekly]) => {
      if (!active) return;
      if (daily.error || weekly.error) {
        const error = daily.error ?? weekly.error;
        console.error("[food-diary] Loading diary failed:", { daily: daily.error, weekly: weekly.error });
        setMessage(error?.code === "PGRST202" ? t("foodDiary.rpcMissing") : t("foodDiary.loadError"));
        return;
      }
      setItems(Array.isArray(daily.data) ? daily.data as Entry[] : []);
      setWeek(Array.isArray(weekly.data) ? weekly.data as DayTotal[] : []);
      setMessage("");
    });
    return () => { active = false; };
  }, [date, supabase, t]);

  const addFood = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase || !selected || !Number.isFinite(amount) || amount <= 0) return;
    setBusy(true); setMessage("");
    const { error } = await supabase.rpc("add_patient_food_diary_entry", {
      p_eaten_on: date, p_meal_type: meal, p_food_name: selected.name,
      p_amount_g: amount, p_kcal: estimatedKcal,
    });
    if (error) {
      console.error("[food-diary] Saving food failed:", error);
      setMessage(error.code === "PGRST202" ? t("foodDiary.rpcMissing") : t("foodDiary.saveError"));
    }
    else {
      const [daily, weekly] = await Promise.all([
        supabase.rpc("get_patient_food_diary", { p_eaten_on: date }),
        supabase.rpc("get_patient_food_diary_week", { p_start: weekStart() }),
      ]);
      setItems(Array.isArray(daily.data) ? daily.data as Entry[] : []);
      setWeek(Array.isArray(weekly.data) ? weekly.data as DayTotal[] : []);
      setQuery(""); setSelected(null); setGrams("100"); setMessage(t("foodDiary.saved"));
    }
    setBusy(false);
  };

  const remove = async (id: string) => {
    if (!supabase) return;
    const { error } = await supabase.rpc("delete_patient_food_diary_entry", { p_id: id });
    if (error) { setMessage(t("foodDiary.deleteError")); return; }
    setItems((current) => current.filter((item) => item.id !== id));
    const { data } = await supabase.rpc("get_patient_food_diary_week", { p_start: weekStart() });
    setWeek(Array.isArray(data) ? data as DayTotal[] : []);
  };

  const weeklyValues = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, index) => {
      const day = new Date(); day.setDate(day.getDate() - 6 + index);
      const key = dateString(day);
      return { key, label: dayNames[(day.getDay() + 6) % 7], value: Number(week.find((item) => item.eaten_on === key)?.total_kcal ?? 0) };
    });
    return days;
  }, [week, dayNames]);
  const maxWeekly = Math.max(1, ...weeklyValues.map((item) => item.value));

  return <section className="mt-6 rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-xl font-bold text-emerald-950">{t("foodDiary.title")}</h2><p className="mt-1 text-sm text-slate-600">{t("foodDiary.description")}</p></div>
      <label className="text-sm font-semibold text-slate-700">{t("foodDiary.date")}<input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="mt-1 block rounded-xl border border-slate-300 px-3 py-2" /></label>
    </div>
    <form onSubmit={addFood} className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <label className="text-sm font-semibold text-slate-700">{t("foodDiary.meal")}<select value={meal} onChange={(event) => setMeal(event.target.value as Meal)} className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2">{MEALS.map((item) => <option key={item} value={item}>{t(`foodDiary.${item}`)}</option>)}</select></label>
      <label className="relative text-sm font-semibold text-slate-700 sm:col-span-2">{t("foodDiary.food")}<input required value={selected?.name ?? query} onChange={(event) => { setSelected(null); setQuery(event.target.value); }} placeholder={t("foodDiary.searchPlaceholder")} className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2" />
        {foods.length > 0 ? <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">{foods.map((food) => <li key={food.id}><button type="button" onClick={() => { setSelected(food); setQuery(food.name); setFoods([]); }} className="w-full px-3 py-2 text-left hover:bg-emerald-50"><span className="block">{food.name}</span><span className="text-xs text-slate-500">{Math.round(food.kcalPer100g)} kcal / 100 g</span></button></li>)}</ul> : null}
        {searching ? <span className="mt-1 block text-xs text-slate-500">{t("foodDiary.searching")}</span> : null}
      </label>
      <label className="text-sm font-semibold text-slate-700">{t("foodDiary.portion")}<input required type="number" min="1" max="10000" step="1" value={grams} onChange={(event) => setGrams(event.target.value)} placeholder="150" className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2" /><span className="mt-1 block text-xs font-normal text-slate-500">{t("foodDiary.approximatePortion")}</span></label>
      <div className="flex items-end gap-3"><p className="pb-2 text-sm font-semibold text-emerald-900">{t("foodDiary.estimated")}: {selected ? `${estimatedKcal} kcal` : "—"}</p><button disabled={busy || !selected} className="mb-1 min-h-10 rounded-xl bg-emerald-800 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50">{busy ? t("foodDiary.saving") : t("foodDiary.add")}</button></div>
    </form>
    {message ? <p role="status" className="mt-3 text-sm text-emerald-800">{message}</p> : null}
    <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[36rem] text-left text-sm"><thead className="border-b border-slate-200 text-slate-500"><tr><th className="py-2">{t("foodDiary.meal")}</th><th>{t("foodDiary.food")}</th><th>{t("foodDiary.grams")}</th><th>{t("foodDiary.calories")}</th><th><span className="sr-only">{t("foodDiary.remove")}</span></th></tr></thead><tbody className="divide-y divide-slate-100">{items.map((item) => <tr key={item.id}><td className="py-3">{t(`foodDiary.${item.meal_type}`)}</td><td className="font-medium text-slate-800">{item.food_name}</td><td>{item.amount_g == null ? "—" : `${item.amount_g} g`}</td><td>{item.kcal == null ? "—" : `${Math.round(Number(item.kcal))} kcal`}</td><td className="text-right"><button type="button" onClick={() => void remove(item.id)} className="font-semibold text-rose-700 underline">{t("foodDiary.remove")}</button></td></tr>)}</tbody></table>{items.length === 0 ? <p className="py-4 text-sm text-slate-500">{t("foodDiary.empty")}</p> : null}</div>
    <p className="mt-3 border-t border-emerald-100 pt-4 text-lg font-bold text-emerald-950">{t("foodDiary.dailyTotal")}: {new Intl.NumberFormat(localeTag).format(todayTotal)} kcal</p>
    <section className="mt-5 rounded-2xl bg-emerald-50 p-4"><h3 className="font-bold text-emerald-950">{t("foodDiary.weekTitle")}</h3><div className="mt-4 grid grid-cols-7 items-end gap-2" aria-label={t("foodDiary.weekTitle")}>{weeklyValues.map((item) => <div key={item.key} className="flex min-w-0 flex-col items-center gap-1"><span className="text-[10px] text-slate-600 sm:text-xs">{item.value ? new Intl.NumberFormat(localeTag).format(item.value) : "—"}</span><div className="flex h-28 w-full items-end"><div title={`${item.value} kcal`} className="w-full rounded-t-md bg-emerald-700" style={{ height: item.value ? `${Math.max(item.value / maxWeekly * 100, 4)}%` : "2px" }} /></div><span className="text-[10px] font-semibold text-slate-600 sm:text-xs">{item.label}</span></div>)}</div></section>
    <p className="mt-3 text-xs text-slate-500">{t("foodDiary.disclaimer")}</p>
  </section>;
}
