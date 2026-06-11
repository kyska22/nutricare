import {
  FieldError,
  FieldErrors,
  UseFormRegister,
  UseFormWatch,
} from "react-hook-form";
import { formOptions } from "@/data/form-options";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { NutritionAssessmentFormValues } from "@/types/nutrition-assessment";
import { calculateAge } from "@/lib/utils/calculate-age";
import { FormSection } from "@/components/ui/form-section";
import {
  InputField,
  SelectField,
  TextareaField,
} from "@/components/ui/form-controls";

interface ClinicalSectionProps {
  register: UseFormRegister<NutritionAssessmentFormValues>;
  errors: FieldErrors<NutritionAssessmentFormValues>;
  watch: UseFormWatch<NutritionAssessmentFormValues>;
}

interface CheckboxGroupProps {
  label: string;
  name:
    | "personalInformation.consultationReasons"
    | "familyHistory.conditions";
  options: readonly string[];
  translationPrefix: string;
  register: UseFormRegister<NutritionAssessmentFormValues>;
}

const optionList = (
  values: readonly string[],
  prefix: string,
  t: (key: string) => string,
) => values.map((value) => ({ value, label: t(`${prefix}.${value}`) }));

function CheckboxGroup({
  label,
  name,
  options,
  translationPrefix,
  register,
}: CheckboxGroupProps) {
  const { t } = useI18n();

  return (
    <fieldset>
      <legend className="mb-3 text-sm font-semibold text-emerald-950">
        {label}
      </legend>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {options.map((option) => (
          <label
            key={option}
            className="flex cursor-pointer items-start gap-3 rounded-xl border border-emerald-950/10 bg-emerald-50/40 px-3.5 py-3 text-sm text-emerald-950 transition hover:border-emerald-600/40"
          >
            <input
              {...register(name)}
              type="checkbox"
              value={option}
              className="mt-0.5 h-4 w-4 rounded border-emerald-900/30 accent-emerald-700"
            />
            <span>{t(`${translationPrefix}.${option}`)}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function PersonalInformationSection({
  register,
  errors,
  watch,
}: ClinicalSectionProps) {
  const { t } = useI18n();
  const sectionErrors = errors.personalInformation;
  const selectedReasons =
    watch("personalInformation.consultationReasons") ?? [];
  const birthDate = watch("personalInformation.birthDate");
  const calculatedAge = birthDate ? calculateAge(birthDate) : null;

  return (
    <FormSection
      number={t("clinicalHistory.sections.personalInformation.number")}
      title={t("clinicalHistory.sections.personalInformation.title")}
      description={t("clinicalHistory.sections.personalInformation.description")}
    >
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <SelectField
          name="personalInformation.consultationType"
          label={t("clinicalHistory.fields.consultationType")}
          register={register}
          error={sectionErrors?.consultationType}
          placeholder={t("placeholders.select")}
          optional
          options={optionList(
            formOptions.consultationTypes,
            "clinicalHistory.options.consultationType",
            t,
          )}
        />
        <InputField
          name="personalInformation.firstName"
          label={t("clinicalHistory.fields.firstName")}
          register={register}
          error={sectionErrors?.firstName}
          placeholder={t("clinicalHistory.placeholders.firstName")}
        />
        <InputField
          name="personalInformation.lastName"
          label={t("clinicalHistory.fields.lastName")}
          register={register}
          error={sectionErrors?.lastName}
          placeholder={t("clinicalHistory.placeholders.lastName")}
        />
        <InputField
          name="personalInformation.email"
          label={t("clinicalHistory.fields.email")}
          register={register}
          error={sectionErrors?.email}
          type="email"
          placeholder={t("clinicalHistory.placeholders.email")}
        />
        <InputField
          name="personalInformation.phone"
          label={t("clinicalHistory.fields.phone")}
          register={register}
          error={sectionErrors?.phone}
          type="tel"
          placeholder={t("clinicalHistory.placeholders.phone")}
        />
        <InputField
          name="personalInformation.country"
          label={t("clinicalHistory.fields.country")}
          register={register}
          error={sectionErrors?.country}
          placeholder={t("clinicalHistory.placeholders.country")}
        />
        <InputField
          name="personalInformation.occupation"
          label={t("clinicalHistory.fields.occupation")}
          register={register}
          error={sectionErrors?.occupation}
          placeholder={t("clinicalHistory.placeholders.occupation")}
        />
        <InputField
          name="personalInformation.identificationNumber"
          label={t("clinicalHistory.fields.identificationNumber")}
          register={register}
          error={sectionErrors?.identificationNumber}
          placeholder={t("clinicalHistory.placeholders.identificationNumber")}
        />
        <InputField
          name="personalInformation.birthDate"
          label={t("clinicalHistory.fields.birthDate")}
          register={register}
          error={sectionErrors?.birthDate}
          type="date"
        />
        <div>
          <span className="mb-2 block text-sm font-semibold text-emerald-950">
            {t("clinicalHistory.fields.calculatedAge")}
          </span>
          <div className="rounded-xl border border-emerald-950/15 bg-emerald-50/50 px-4 py-3 text-[15px] font-semibold text-emerald-950">
            {calculatedAge
              ? `${calculatedAge} ${t("units.years")}`
              : t("summary.notProvided")}
          </div>
        </div>
        <SelectField
          name="personalInformation.sex"
          label={t("fields.sex")}
          register={register}
          error={sectionErrors?.sex}
          placeholder={t("placeholders.select")}
          optional
          options={optionList(["male", "female"], "options.sex", t)}
        />
      </div>

      <div className="mt-8">
        <CheckboxGroup
          label={t("clinicalHistory.fields.consultationReason")}
          name="personalInformation.consultationReasons"
          options={formOptions.consultationReasons}
          translationPrefix="clinicalHistory.options.consultationReason"
          register={register}
        />
        {selectedReasons.includes("other") ? (
          <div className="mt-4">
            <InputField
              name="personalInformation.otherConsultationReason"
              label={t("clinicalHistory.fields.otherConsultationReason")}
              register={register}
              error={sectionErrors?.otherConsultationReason}
              placeholder={t(
                "clinicalHistory.placeholders.otherConsultationReason",
              )}
            />
          </div>
        ) : null}
      </div>
    </FormSection>
  );
}

export function PersonalHistorySection({
  register,
  errors,
  watch,
}: ClinicalSectionProps) {
  const { t } = useI18n();
  const sectionErrors = errors.personalHistory;
  const sex = watch("personalInformation.sex");

  return (
    <FormSection
      number={t("clinicalHistory.sections.personalHistory.number")}
      title={t("clinicalHistory.sections.personalHistory.title")}
      description={t("clinicalHistory.sections.personalHistory.description")}
    >
      <div className="grid gap-6 md:grid-cols-2">
        <TextareaField
          name="personalHistory.currentOrPreviousDiseases"
          label={t("clinicalHistory.fields.currentDiseases")}
          register={register}
          error={sectionErrors?.currentOrPreviousDiseases}
          placeholder={t("clinicalHistory.placeholders.clinicalDetails")}
        />
        <TextareaField
          name="personalHistory.previousDiseases"
          label={t("clinicalHistory.fields.previousDiseases")}
          register={register}
          error={sectionErrors?.previousDiseases}
          placeholder={t("clinicalHistory.placeholders.clinicalDetails")}
        />
        <TextareaField
          name="personalHistory.previousSurgeries"
          label={t("clinicalHistory.fields.surgeriesPerformed")}
          register={register}
          error={sectionErrors?.previousSurgeries}
          placeholder={t("clinicalHistory.placeholders.clinicalDetails")}
        />
        <TextareaField
          name="personalHistory.currentMedications"
          label={t("clinicalHistory.fields.currentMedications")}
          register={register}
          error={sectionErrors?.currentMedications}
          placeholder={t("clinicalHistory.placeholders.clinicalDetails")}
        />
        <TextareaField
          name="personalHistory.currentSupplements"
          label={t("clinicalHistory.fields.currentSupplements")}
          register={register}
          error={sectionErrors?.currentSupplements}
          placeholder={t("clinicalHistory.placeholders.clinicalDetails")}
        />
      </div>

      {sex === "female" ? (
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          <SelectField
            name="personalHistory.hasChildren"
            label={t("clinicalHistory.fields.hasChildren")}
            register={register}
            error={sectionErrors?.hasChildren}
            placeholder={t("placeholders.select")}
            optional
            options={optionList(["yes", "no"], "options.yesNo", t)}
          />
          <InputField
            name="personalHistory.numberOfChildren"
            label={t("clinicalHistory.fields.numberOfChildren")}
            register={register}
            error={sectionErrors?.numberOfChildren}
            type="number"
            min="0"
            step="1"
            placeholder={t("clinicalHistory.placeholders.zero")}
          />
          <SelectField
            name="personalHistory.birthType"
            label={t("clinicalHistory.fields.birthType")}
            register={register}
            error={sectionErrors?.birthType}
            placeholder={t("placeholders.select")}
            optional
            options={optionList(
              formOptions.birthTypes,
              "clinicalHistory.options.birthType",
              t,
            )}
          />
        </div>
      ) : null}
    </FormSection>
  );
}

export function FamilyHistorySection({
  register,
  errors,
  watch,
}: ClinicalSectionProps) {
  const { t } = useI18n();
  const sectionErrors = errors.familyHistory;
  const selectedConditions = watch("familyHistory.conditions") ?? [];
  const yesNo = optionList(["yes", "no"], "options.yesNo", t);

  return (
    <FormSection
      number={t("clinicalHistory.sections.familyHistory.number")}
      title={t("clinicalHistory.sections.familyHistory.title")}
      description={t("clinicalHistory.sections.familyHistory.description")}
    >
      <div className="grid gap-6 md:grid-cols-2">
        <SelectField
          name="familyHistory.fatherAlive"
          label={t("clinicalHistory.fields.fatherAlive")}
          register={register}
          error={sectionErrors?.fatherAlive}
          placeholder={t("placeholders.select")}
          optional
          options={yesNo}
        />
        <InputField
          name="familyHistory.fatherAge"
          label={t("clinicalHistory.fields.fatherAge")}
          register={register}
          error={sectionErrors?.fatherAge}
          type="number"
          min="0"
          step="1"
          unit={t("units.years")}
        />
        <SelectField
          name="familyHistory.motherAlive"
          label={t("clinicalHistory.fields.motherAlive")}
          register={register}
          error={sectionErrors?.motherAlive}
          placeholder={t("placeholders.select")}
          optional
          options={yesNo}
        />
        <InputField
          name="familyHistory.motherAge"
          label={t("clinicalHistory.fields.motherAge")}
          register={register}
          error={sectionErrors?.motherAge}
          type="number"
          min="0"
          step="1"
          unit={t("units.years")}
        />
      </div>

      <div className="mt-8">
        <CheckboxGroup
          label={t("clinicalHistory.fields.familyConditions")}
          name="familyHistory.conditions"
          options={formOptions.familyHistoryConditions}
          translationPrefix="clinicalHistory.options.familyCondition"
          register={register}
        />
        {selectedConditions.includes("other") ? (
          <div className="mt-4">
            <InputField
              name="familyHistory.otherCondition"
              label={t("clinicalHistory.fields.otherFamilyCondition")}
              register={register}
              error={sectionErrors?.otherCondition}
              placeholder={t("clinicalHistory.placeholders.otherFamilyCondition")}
            />
          </div>
        ) : null}
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <TextareaField
          name="familyHistory.fatherDiseases"
          label={t("clinicalHistory.fields.fatherDiseases")}
          register={register}
          error={sectionErrors?.fatherDiseases}
          placeholder={t("clinicalHistory.placeholders.clinicalDetails")}
        />
        <TextareaField
          name="familyHistory.motherDiseases"
          label={t("clinicalHistory.fields.motherDiseases")}
          register={register}
          error={sectionErrors?.motherDiseases}
          placeholder={t("clinicalHistory.placeholders.clinicalDetails")}
        />
      </div>
      <div className="mt-6">
        <TextareaField
          name="familyHistory.observations"
          label={t("clinicalHistory.fields.familyObservations")}
          register={register}
          error={sectionErrors?.observations}
          placeholder={t("clinicalHistory.placeholders.clinicalDetails")}
        />
      </div>
    </FormSection>
  );
}

export function DietaryHabitsSection({
  register,
  errors,
}: ClinicalSectionProps) {
  const { t } = useI18n();
  const sectionErrors = errors.dietaryHabits;
  const frequencyOptions = optionList(
    formOptions.foodFrequencyValues,
    "clinicalHistory.options.foodFrequency",
    t,
  );

  return (
    <FormSection
      number={t("clinicalHistory.sections.dietaryHabits.number")}
      title={t("clinicalHistory.sections.dietaryHabits.title")}
      description={t("clinicalHistory.sections.dietaryHabits.description")}
    >
      <div className="grid gap-6 md:grid-cols-2">
        <TextareaField
          name="dietaryHabits.foodAllergies"
          label={t("clinicalHistory.fields.foodAllergies")}
          register={register}
          error={sectionErrors?.foodAllergies}
          placeholder={t("clinicalHistory.placeholders.foodAllergies")}
        />
        <TextareaField
          name="dietaryHabits.foodPreferences"
          label={t("clinicalHistory.fields.foodPreferences")}
          register={register}
          error={sectionErrors?.foodPreferences}
          placeholder={t("clinicalHistory.placeholders.foodPreferences")}
        />
      </div>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <InputField
          name="dietaryHabits.mealsAtHomeDays"
          label={t("clinicalHistory.fields.mealsAtHomeDays")}
          register={register}
          error={sectionErrors?.mealsAtHomeDays}
          type="number"
          min="0"
          step="1"
          placeholder={t("clinicalHistory.placeholders.zeroToSeven")}
          unit={t("clinicalHistory.units.days")}
        />
        <InputField
          name="dietaryHabits.mealsAwayDays"
          label={t("clinicalHistory.fields.mealsAwayDays")}
          register={register}
          error={sectionErrors?.mealsAwayDays}
          type="number"
          min="0"
          step="1"
          placeholder={t("clinicalHistory.placeholders.zeroToSeven")}
          unit={t("clinicalHistory.units.days")}
        />
      </div>

      <div className="mt-8">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-[0.12em] text-emerald-800">
          {t("clinicalHistory.fields.weeklyFoodFrequency")}
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {formOptions.foodGroups.map((group) => (
            <SelectField
              key={group}
              name={`dietaryHabits.weeklyFrequency.${group}`}
              label={t(`clinicalHistory.options.foodGroup.${group}`)}
              register={register}
              error={
                sectionErrors?.weeklyFrequency?.[group] as
                  | FieldError
                  | undefined
              }
              placeholder={t("placeholders.select")}
              optional
              options={frequencyOptions}
            />
          ))}
        </div>
      </div>
    </FormSection>
  );
}
