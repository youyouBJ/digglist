/* Shared input style — uses design tokens from globals.css */
export const inputClass = [
  "w-full rounded-xl px-4 py-3 text-sm",
  "focus:outline-none transition-colors",
  "placeholder:text-[var(--t3)]",
  "text-[var(--t1)]",
  "bg-[var(--bg3)]",
  "border border-[var(--rule2)]",
  "focus:border-[var(--rule3)]",
].join(" ");

export function Field({
  label,
  required,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <label className="text-[10px] font-medium tracking-[0.12em] uppercase"
        style={{ color: "var(--t3)" }}>
        {label}
        {required && <span className="ml-0.5" style={{ color: "var(--t2)" }}>*</span>}
      </label>
      {children}
    </div>
  );
}
