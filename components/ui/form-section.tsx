interface FormSectionProps {
  number: string;
  title: string;
  description: string;
  children: React.ReactNode;
}

export function FormSection({
  number,
  title,
  description,
  children,
}: FormSectionProps) {
  return (
    <section className="overflow-hidden rounded-3xl border border-emerald-900/10 bg-white shadow-[0_18px_60px_rgba(25,82,54,0.08)]">
      <header className="flex items-start gap-4 border-b border-emerald-900/10 bg-emerald-50/80 px-5 py-5 sm:px-8 sm:py-6">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-700 text-sm font-bold text-white">
          {number}
        </span>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-emerald-950 sm:text-2xl">
            {title}
          </h2>
          <p className="mt-1 text-sm leading-6 text-emerald-900/65">{description}</p>
        </div>
      </header>
      <div className="p-5 sm:p-8">{children}</div>
    </section>
  );
}
