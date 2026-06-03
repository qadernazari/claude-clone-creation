import type { BilingualText } from "@/lib/cms";

const input =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";

export function BilingualField({
  label,
  value,
  onChange,
  textarea,
  rows = 2,
  placeholderEn,
  placeholderFa,
}: {
  label: string;
  value: BilingualText;
  onChange: (v: BilingualText) => void;
  textarea?: boolean;
  rows?: number;
  placeholderEn?: string;
  placeholderFa?: string;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <label className="block">
        <span className="block text-xs font-medium text-muted-foreground mb-1.5">
          {label} — English
        </span>
        {textarea ? (
          <textarea
            value={value.en}
            rows={rows}
            onChange={(e) => onChange({ ...value, en: e.target.value })}
            placeholder={placeholderEn}
            className={input}
          />
        ) : (
          <input
            type="text"
            value={value.en}
            onChange={(e) => onChange({ ...value, en: e.target.value })}
            placeholder={placeholderEn}
            className={input}
          />
        )}
      </label>
      <label className="block">
        <span className="block text-xs font-medium text-muted-foreground mb-1.5">
          {label} — فارسی
        </span>
        {textarea ? (
          <textarea
            value={value.fa}
            rows={rows}
            dir="rtl"
            onChange={(e) => onChange({ ...value, fa: e.target.value })}
            placeholder={placeholderFa}
            className={input}
          />
        ) : (
          <input
            type="text"
            dir="rtl"
            value={value.fa}
            onChange={(e) => onChange({ ...value, fa: e.target.value })}
            placeholder={placeholderFa}
            className={input}
          />
        )}
      </label>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <header className="mb-6 flex items-end justify-between gap-4 flex-wrap">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {right}
    </header>
  );
}

export function Panel({
  title,
  description,
  children,
  className = "",
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-lg border border-border bg-card/40 p-5 sm:p-6 ${className}`}>
      {title && (
        <header className="mb-4">
          <h3 className="text-base font-medium">{title}</h3>
          {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
        </header>
      )}
      {children}
    </section>
  );
}

export function SaveBar({
  onSave,
  saving,
  saved,
  error,
  label = "Save changes",
}: {
  onSave: () => void;
  saving: boolean;
  saved: boolean;
  error: string | null;
  label?: string;
}) {
  return (
    <div className="sticky bottom-4 mt-6 flex items-center gap-3 rounded-md border border-border bg-background/95 backdrop-blur p-3">
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
      >
        {saving ? "Saving…" : label}
      </button>
      {saved && <span className="text-sm text-emerald-400">✓ Saved</span>}
      {error && <span className="text-sm text-destructive">{error}</span>}
    </div>
  );
}
