"use client";

// cciD Lab — tiny form/UI primitives extending the site's design language:
// hairline underline inputs on ivory, 12px all-caps grey labels, PxGrotesk 15px,
// purple text-buttons with the arrow-nudge interaction from the public site.

export function FieldLabel({ children }) {
  return (
    <span className="block font-light uppercase text-[11px] tracking-[0.01em] text-[#888] mb-1">
      {children}
    </span>
  );
}

const inputBase =
  "w-full bg-transparent text-[14px] leading-[1.4] py-1 border-0 border-b border-primaryB/20 rounded-none focus:outline-none focus:border-primaryB transition-colors duration-200 placeholder:text-primaryB/30";

export function TextField({ label, ...props }) {
  return (
    <label className="block min-w-0">
      <FieldLabel>{label}</FieldLabel>
      <input {...props} className={`${inputBase} ${props.className || ""}`} />
    </label>
  );
}

export function TextArea({ label, ...props }) {
  return (
    <label className="block min-w-0">
      <FieldLabel>{label}</FieldLabel>
      <textarea
        rows={3}
        {...props}
        className={`${inputBase} resize-y min-h-[3.2rem] ${props.className || ""}`}
      />
    </label>
  );
}

export function SelectField({ label, children, ...props }) {
  return (
    <label className="block min-w-0">
      <FieldLabel>{label}</FieldLabel>
      <select {...props} className={`${inputBase} appearance-none cursor-pointer pr-5 ${props.className || ""}`}>
        {children}
      </select>
    </label>
  );
}

export function CheckField({ label, checked, onChange, disabled }) {
  return (
    <label
      className={`inline-flex items-center gap-2 text-[13px] leading-none select-none ${disabled ? "opacity-40" : "cursor-pointer"}`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="appearance-none w-[14px] h-[14px] border border-primaryB/40 checked:bg-[#4E22D6] checked:border-[#4E22D6] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#5D009C] transition-colors"
      />
      {label}
    </label>
  );
}

export function ArrowButton({ children, className = "", ...props }) {
  return (
    <button
      type="button"
      {...props}
      className={`group inline-flex items-center gap-1.5 text-[14px] font-medium text-[#5D009C] hover:text-[#7a1fc0] disabled:opacity-40 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[#5D009C] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F0F0EC] ${className}`}
    >
      {children}
      <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-1">
        &rarr;
      </span>
    </button>
  );
}

// 툴바 액션(+Project / +Schedule / +Google). 버튼과 링크가 섞여 있어도 같은 크기로
// 보이도록 클래스를 공유한다.
const actionCls =
  "inline-flex items-center justify-center min-h-[30px] px-2 text-[14px] font-medium leading-none text-[#5D009C] hover:text-[#7a1fc0] disabled:opacity-40 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[#5D009C]";

export function ActionButton({ children, className = "", ...props }) {
  return (
    <button type="button" {...props} className={`${actionCls} ${className}`}>
      {children}
    </button>
  );
}

export function ActionLink({ children, className = "", ...props }) {
  return (
    <a {...props} className={`${actionCls} ${className}`}>
      {children}
    </a>
  );
}

// Thin-border box button — echoes the public nav's boxed indicator.
export function BoxButton({ children, active = false, className = "", ...props }) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex items-center justify-center min-h-[30px] px-3 text-[13px] leading-none border transition-[opacity,background-color,border-color] duration-200 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#5D009C] disabled:opacity-40 ${
        active
          ? "bg-white/80 border-primaryB/70 text-primaryB"
          : "opacity-50 border-primaryB/25 text-primaryB hover:opacity-100 hover:border-primaryB/60"
      } ${className}`}
    >
      {children}
    </button>
  );
}

export function GhostButton({ children, className = "", ...props }) {
  return (
    <button
      type="button"
      {...props}
      className={`text-[13px] text-primaryB/60 hover:text-primaryB underline-offset-2 hover:underline transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[#5D009C] disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}

export function SectionHeading({ children }) {
  return (
    <div className="font-light uppercase text-[11px] tracking-[0.01em] text-[#888] pb-1.5 border-b border-primaryB/10 mb-3">
      {children}
    </div>
  );
}

export function Tag({ color = "#888", children }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-[2px] text-[10px] uppercase tracking-[0.08em] leading-none"
      style={{ backgroundColor: `${color}1a`, color }}
    >
      {children}
    </span>
  );
}
