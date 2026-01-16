type CardPreviewProps = {
  options: Array<string | number>;
  label?: string;
};

const parseOptionLabel = (optionText: string) => {
  const [first, ...rest] = optionText.split(" ");
  const hasLeadingEmoji =
    first && /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u.test(first);

  return {
    icon: hasLeadingEmoji ? first : "",
    label: hasLeadingEmoji ? rest.join(" ").trim() || first : optionText,
  };
};

export const CardPreview = ({ options, label }: CardPreviewProps) => {
  const colorPalette = [
    "border-blue-200/80 bg-blue-50 text-blue-900 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-100",
    "border-emerald-200/80 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100",
    "border-amber-200/80 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100",
    "border-rose-200/80 bg-rose-50 text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100",
    "border-indigo-200/80 bg-indigo-50 text-indigo-900 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-100",
    "border-cyan-200/80 bg-cyan-50 text-cyan-900 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-100",
    "border-fuchsia-200/80 bg-fuchsia-50 text-fuchsia-900 dark:border-fuchsia-500/30 dark:bg-fuchsia-500/10 dark:text-fuchsia-100",
    "border-lime-200/80 bg-lime-50 text-lime-900 dark:border-lime-500/30 dark:bg-lime-500/10 dark:text-lime-100",
    "border-sky-200/80 bg-sky-50 text-sky-900 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-100",
    "border-teal-200/80 bg-teal-50 text-teal-900 dark:border-teal-500/30 dark:bg-teal-500/10 dark:text-teal-100",
  ];

  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
      <div className="space-y-4">
        {label ? (
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-600">
            {label}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-3">
          {options.map((option, index) => {
            const optionLabel = `${option}`;
            const { icon, label: textLabel } = parseOptionLabel(optionLabel);
            const colorClass = colorPalette[index % colorPalette.length];

            return (
              <div
                key={optionLabel}
                className={`flex h-18 w-14 flex-col items-center justify-center gap-1 rounded-lg border-2 px-3 py-2 text-center font-semibold shadow-sm md:h-24 md:w-16 ${colorClass}`}
              >
                {icon ? (
                  <span className="text-2xl" aria-hidden="true">
                    {icon}
                  </span>
                ) : null}
                <span
                  className={`leading-tight ${
                    icon ? "text-xs" : "text-lg"
                  }`}
                >
                  {textLabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
