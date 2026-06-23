import {
  FieldErrors,
  UseFormRegister,
  UseFormWatch,
} from "react-hook-form";
import { formOptions } from "@/data/form-options";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { NutritionAssessmentFormValues } from "@/types/nutrition-assessment";
import { FormSection } from "@/components/ui/form-section";
import {
  InputField,
  SelectField,
  TextareaField,
  TimeWithPeriodField,
} from "@/components/ui/form-controls";

interface SectionProps {
  register: UseFormRegister<NutritionAssessmentFormValues>;
  errors: FieldErrors<NutritionAssessmentFormValues>;
  watch?: UseFormWatch<NutritionAssessmentFormValues>;
}

const mapOptions = (
  options: readonly string[],
  prefix: string,
  t: (key: string) => string,
) =>
  options.map((value) => ({
    value,
    label:
      prefix === "options.exerciseFrequency" && value !== "moreThan8"
        ? value
        : t(`${prefix}.${value}`),
  }));

export function PsychobiologicalSection({
  register,
  errors,
  watch,
}: SectionProps) {
  const { t } = useI18n();
  const sectionErrors = errors.psychobiological;
  const tobacco = watch?.("psychobiological.tobacco");
  const alcohol = watch?.("psychobiological.alcohol");

  return (
    <FormSection
      number={t("sections.psychobiological.number")}
      title={t("sections.psychobiological.title")}
      description={t("sections.psychobiological.description")}
    >
      <div className="grid gap-6 md:grid-cols-2">
        <SelectField
          name="psychobiological.activityLevel"
          label={t("fields.activityLevel")}
          register={register}
          error={sectionErrors?.activityLevel}
          required
          placeholder={t("placeholders.select")}
          options={mapOptions(
            formOptions.activityLevels,
            "options.activityLevel",
            t,
          )}
        />
        <SelectField
          name="psychobiological.exerciseType"
          label={t("fields.exerciseType")}
          register={register}
          error={sectionErrors?.exerciseType}
          required
          placeholder={t("placeholders.select")}
          options={mapOptions(
            formOptions.exerciseTypes,
            "options.exerciseType",
            t,
          )}
        />
        <SelectField
          name="psychobiological.exerciseFrequency"
          label={t("fields.exerciseFrequency")}
          register={register}
          error={sectionErrors?.exerciseFrequency}
          required
          placeholder={t("placeholders.select")}
          options={mapOptions(
            formOptions.exerciseFrequencies,
            "options.exerciseFrequency",
            t,
          )}
        />
        <InputField
          name="psychobiological.dailyWaterLiters"
          label={t("fields.dailyWaterLiters")}
          register={register}
          error={sectionErrors?.dailyWaterLiters}
          required
          type="number"
          min="0"
          step="0.1"
          placeholder={t("placeholders.water")}
          unit={t("fields.waterUnit")}
        />
        <SelectField
          name="psychobiological.tobacco"
          label={t("clinicalHistory.fields.tobacco")}
          register={register}
          error={sectionErrors?.tobacco}
          placeholder={t("placeholders.select")}
          optional
          options={mapOptions(
            formOptions.substanceUseStatuses,
            "clinicalHistory.options.substanceUse",
            t,
          )}
        />
        {tobacco === "former" ? (
          <SelectField
            name="psychobiological.tobaccoQuitTime"
            label={t("clinicalHistory.fields.tobaccoQuitTime")}
            register={register}
            error={sectionErrors?.tobaccoQuitTime}
            placeholder={t("placeholders.select")}
            optional
            options={mapOptions(
              formOptions.abandonmentTimes,
              "clinicalHistory.options.abandonmentTime",
              t,
            )}
          />
        ) : null}
        <SelectField
          name="psychobiological.alcohol"
          label={t("clinicalHistory.fields.alcohol")}
          register={register}
          error={sectionErrors?.alcohol}
          placeholder={t("placeholders.select")}
          optional
          options={mapOptions(
            formOptions.substanceUseStatuses,
            "clinicalHistory.options.substanceUse",
            t,
          )}
        />
        {alcohol === "former" ? (
          <SelectField
            name="psychobiological.alcoholQuitTime"
            label={t("clinicalHistory.fields.alcoholQuitTime")}
            register={register}
            error={sectionErrors?.alcoholQuitTime}
            placeholder={t("placeholders.select")}
            optional
            options={mapOptions(
              formOptions.abandonmentTimes,
              "clinicalHistory.options.abandonmentTime",
              t,
            )}
          />
        ) : null}
        <SelectField
          name="psychobiological.coffee"
          label={t("clinicalHistory.fields.coffee")}
          register={register}
          error={sectionErrors?.coffee}
          placeholder={t("placeholders.select")}
          optional
          options={mapOptions(["yes", "no"], "options.yesNo", t)}
        />
        <SelectField
          name="psychobiological.averageSleepHours"
          label={t("clinicalHistory.fields.averageSleepHours")}
          register={register}
          error={sectionErrors?.averageSleepHours}
          placeholder={t("placeholders.select")}
          optional
          options={mapOptions(
            formOptions.sleepHourRanges,
            "clinicalHistory.options.sleepHours",
            t,
          )}
        />
        <SelectField
          name="psychobiological.sleepQuality"
          label={t("clinicalHistory.fields.sleepQuality")}
          register={register}
          error={sectionErrors?.sleepQuality}
          placeholder={t("placeholders.select")}
          optional
          options={mapOptions(
            formOptions.sleepQualities,
            "clinicalHistory.options.sleepQuality",
            t,
          )}
        />
      </div>
    </FormSection>
  );
}

export function GastrointestinalSection({ register, errors }: SectionProps) {
  const { t } = useI18n();
  const sectionErrors = errors.gastrointestinal;
  const yesNoOptions = ["yes", "no"].map((value) => ({
    value,
    label: t(`options.yesNo.${value}`),
  }));

  return (
    <FormSection
      number={t("sections.gastrointestinal.number")}
      title={t("sections.gastrointestinal.title")}
      description={t("sections.gastrointestinal.description")}
    >
      <div className="grid gap-6 md:grid-cols-3">
        <SelectField
          name="gastrointestinal.bowelFrequency"
          label={t("fields.bowelFrequency")}
          register={register}
          error={sectionErrors?.bowelFrequency}
          required
          placeholder={t("placeholders.select")}
          options={mapOptions(
            formOptions.bowelFrequencies,
            "options.bowelFrequency",
            t,
          )}
        />
        <SelectField
          name="gastrointestinal.stoolConsistency"
          label={t("fields.stoolConsistency")}
          register={register}
          error={sectionErrors?.stoolConsistency}
          required
          placeholder={t("placeholders.select")}
          options={mapOptions(
            formOptions.stoolConsistencies,
            "options.stoolConsistency",
            t,
          )}
        />
        <SelectField
          name="gastrointestinal.stoolColor"
          label={t("fields.stoolColor")}
          register={register}
          error={sectionErrors?.stoolColor}
          required
          placeholder={t("placeholders.select")}
          options={mapOptions(formOptions.stoolColors, "options.stoolColor", t)}
        />
      </div>

      <div className="mt-8">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-[0.12em] text-emerald-800">
          {t("fields.gastrointestinalHabits")}
        </h3>
        <div className="overflow-hidden rounded-2xl border border-emerald-950/10">
          {(["constipation", "diarrhea", "hemorrhoids"] as const).map(
            (habit, index) => (
              <div
                key={habit}
                className={`grid items-center gap-4 px-4 py-4 sm:grid-cols-[1fr_12rem] sm:px-5 ${
                  index > 0 ? "border-t border-emerald-950/10" : ""
                }`}
              >
                <span className="font-medium text-emerald-950">
                  {t(`fields.${habit}`)}
                  <span className="ml-1 text-rose-600">*</span>
                </span>
                <div>
                  <div className="grid grid-cols-2 gap-2">
                    {yesNoOptions.map((option) => (
                      <label key={option.value} className="relative">
                        <input
                          {...register(`gastrointestinal.${habit}`)}
                          type="radio"
                          value={option.value}
                          className="peer sr-only"
                        />
                        <span className="flex justify-center rounded-xl border border-emerald-950/15 px-3 py-2 text-sm font-semibold text-emerald-900 transition peer-checked:border-emerald-700 peer-checked:bg-emerald-700 peer-checked:text-white peer-focus-visible:ring-4 peer-focus-visible:ring-emerald-100">
                          {option.label}
                        </span>
                      </label>
                    ))}
                  </div>
                  {sectionErrors?.[habit] ? (
                    <span role="alert" className="mt-1.5 block text-sm font-medium text-rose-600">
                      {sectionErrors[habit]?.message}
                    </span>
                  ) : null}
                </div>
              </div>
            ),
          )}
        </div>
      </div>
    </FormSection>
  );
}

export function RecallSection({ register, errors }: SectionProps) {
  const { t } = useI18n();
  const sectionErrors = errors.recall24Hours;
  const meals = ["breakfast", "lunch", "dinner", "snack"] as const;

  return (
    <FormSection
      number={t("sections.recall.number")}
      title={t("sections.recall.title")}
      description={t("sections.recall.description")}
    >
      <div className="space-y-7">
        {meals.map((meal) => (
          <div
            key={meal}
            className="grid gap-5 border-b border-emerald-950/10 pb-7 last:border-0 last:pb-0 md:grid-cols-[1fr_14rem]"
          >
            <TextareaField
              name={`recall24Hours.${meal}`}
              label={t(`fields.${meal}`)}
              register={register}
              error={sectionErrors?.[meal]}
              required
              placeholder={t("placeholders.food")}
            />
            <TimeWithPeriodField
              timeName={`recall24Hours.${meal}Time`}
              periodName={`recall24Hours.${meal}Period`}
              label={t(`fields.${meal}Time`)}
              periodLabel={t("fields.timePeriod")}
              register={register}
              timeError={sectionErrors?.[`${meal}Time`]}
              periodError={sectionErrors?.[`${meal}Period`]}
              required
              timePlaceholder={t("placeholders.time12Hour")}
              periodPlaceholder={t("placeholders.period")}
              options={[
                { value: "AM", label: t("options.timePeriod.AM") },
                { value: "PM", label: t("options.timePeriod.PM") },
              ]}
            />
          </div>
        ))}
      </div>
    </FormSection>
  );
}

export function AnthropometricsSection({ register, errors }: SectionProps) {
  const { t } = useI18n();
  const sectionErrors = errors.anthropometrics;

  return (
    <FormSection
      number={t("clinicalHistory.anthropometricsNumber")}
      title={t("sections.anthropometrics.title")}
      description={t("sections.anthropometrics.description")}
    >
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <InputField
          name="anthropometrics.weightKg"
          label={t("fields.weightKg")}
          register={register}
          error={sectionErrors?.weightKg}
          required
          type="number"
          min="0"
          step="0.1"
          placeholder={t("placeholders.weight")}
          unit={t("units.kilograms")}
        />
        <InputField
          name="anthropometrics.heightMeters"
          label={t("fields.heightMeters")}
          register={register}
          error={sectionErrors?.heightMeters}
          required
          type="number"
          min="0"
          step="0.01"
          placeholder={t("placeholders.height")}
          unit={t("units.meters")}
        />
        <InputField
          name="anthropometrics.abdominalCircumferenceCm"
          label={t("fields.abdominalCircumferenceCm")}
          register={register}
          error={sectionErrors?.abdominalCircumferenceCm}
          required
          type="number"
          min="0"
          step="0.1"
          placeholder={t("placeholders.circumference")}
          unit={t("units.centimeters")}
        />
        <InputField
          name="anthropometrics.hipCircumferenceCm"
          label={t("fields.hipCircumferenceCm")}
          register={register}
          error={sectionErrors?.hipCircumferenceCm}
          type="number"
          min="0"
          step="0.1"
          placeholder={t("placeholders.circumference")}
          unit={t("units.centimeters")}
        />
      </div>
    </FormSection>
  );
}
