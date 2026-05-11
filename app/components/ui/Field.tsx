export const inputClass =
  "w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-white/30 transition-colors";

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
      <label className="text-xs font-semibold uppercase tracking-widest text-white/40">
        {label}
        {required && <span className="text-white/60 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
