import {
  FieldError,
  FieldValues,
  Path,
  UseFormRegister,
} from "react-hook-form";

interface BaseControlProps<T extends FieldValues> {
  name: Path<T>;
  label: string;
  register: UseFormRegister<T>;
  error?: FieldError;
  required?: boolean;
}

interface SelectFieldProps<T extends FieldValues> extends BaseControlProps<T> {
  placeholder: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  optional?: boolean;
}

interface InputFieldProps<T extends FieldValues> extends BaseControlProps<T> {
  type?: "number" | "time" | "text" | "email" | "tel" | "date";
  placeholder?: string;
  step?: string;
  min?: string;
  unit?: string;
}

interface TextareaFieldProps<T extends FieldValues> extends BaseControlProps<T> {
  placeholder: string;
}

interface TimeWithPeriodFieldProps<T extends FieldValues> {
  timeName: Path<T>;
  periodName: Path<T>;
  label: string;
  periodLabel: string;
  timePlaceholder: string;
  periodPlaceholder: string;
  register: UseFormRegister<T>;
  timeError?: FieldError;
  periodError?: FieldError;
  options: ReadonlyArray<{ value: string; label: string }>;
  required?: boolean;
}

const controlClassName =
  "w-full rounded-xl border bg-white px-4 py-3 text-[15px] text-emerald-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100";

function FieldLabel({
  label,
  required,
}: {
  label: string;
  required?: boolean;
}) {
  return (
    <span className="mb-2 block text-sm font-semibold text-emerald-950">
      {label}
      {required ? <span className="ml-1 text-rose-600">*</span> : null}
    </span>
  );
}

function ErrorMessage({ error }: { error?: FieldError }) {
  return error ? (
    <span role="alert" className="mt-1.5 block text-sm font-medium text-rose-600">
      {error.message}
    </span>
  ) : null;
}

export function SelectField<T extends FieldValues>({
  name,
  label,
  register,
  error,
  required,
  placeholder,
  options,
  optional,
}: SelectFieldProps<T>) {
  return (
    <label className="block">
      <FieldLabel label={label} required={required} />
      <select
        {...register(
          name,
          optional
            ? { setValueAs: (value) => (value === "" ? undefined : value) }
            : undefined,
        )}
        aria-invalid={Boolean(error)}
        className={`${controlClassName} ${error ? "border-rose-400" : "border-emerald-950/15"}`}
        defaultValue=""
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ErrorMessage error={error} />
    </label>
  );
}

export function InputField<T extends FieldValues>({
  name,
  label,
  register,
  error,
  required,
  type = "text",
  placeholder,
  step,
  min,
  unit,
}: InputFieldProps<T>) {
  return (
    <label className="block">
      <FieldLabel label={label} required={required} />
      <div className="relative">
        <input
          {...register(
            name,
            type === "number"
              ? {
                  setValueAs: (value) =>
                    value === "" ? undefined : Number(value),
                }
              : undefined,
          )}
          type={type}
          placeholder={placeholder}
          step={step}
          min={min}
          aria-invalid={Boolean(error)}
          className={`${controlClassName} ${unit ? "pr-20" : ""} ${
            error ? "border-rose-400" : "border-emerald-950/15"
          }`}
        />
        {unit ? (
          <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-semibold text-slate-500">
            {unit}
          </span>
        ) : null}
      </div>
      <ErrorMessage error={error} />
    </label>
  );
}

export function TextareaField<T extends FieldValues>({
  name,
  label,
  register,
  error,
  required,
  placeholder,
}: TextareaFieldProps<T>) {
  return (
    <label className="block">
      <FieldLabel label={label} required={required} />
      <textarea
        {...register(name)}
        rows={4}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        className={`${controlClassName} min-h-28 resize-y ${
          error ? "border-rose-400" : "border-emerald-950/15"
        }`}
      />
      <ErrorMessage error={error} />
    </label>
  );
}

export function TimeWithPeriodField<T extends FieldValues>({
  timeName,
  periodName,
  label,
  periodLabel,
  timePlaceholder,
  periodPlaceholder,
  register,
  timeError,
  periodError,
  options,
  required,
}: TimeWithPeriodFieldProps<T>) {
  return (
    <fieldset>
      <legend className="mb-2 block text-sm font-semibold text-emerald-950">
        {label}
        {required ? <span className="ml-1 text-rose-600">*</span> : null}
      </legend>
      <div className="grid grid-cols-[minmax(0,1fr)_6.5rem] gap-2">
        <div>
          <input
            {...register(timeName)}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder={timePlaceholder}
            aria-label={label}
            aria-invalid={Boolean(timeError)}
            className={`${controlClassName} ${
              timeError ? "border-rose-400" : "border-emerald-950/15"
            }`}
          />
          <ErrorMessage error={timeError} />
        </div>
        <div>
          <select
            {...register(periodName)}
            aria-label={periodLabel}
            aria-invalid={Boolean(periodError)}
            defaultValue=""
            className={`${controlClassName} px-3 ${
              periodError ? "border-rose-400" : "border-emerald-950/15"
            }`}
          >
            <option value="" disabled>
              {periodPlaceholder}
            </option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ErrorMessage error={periodError} />
        </div>
      </div>
    </fieldset>
  );
}
