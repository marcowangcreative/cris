import { cloneElement, useId, type ButtonHTMLAttributes, type ReactElement, type ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "md" | "small";
};

export function Button({ variant = "primary", size = "md", className = "", type = "button", ...props }: ButtonProps) {
  const variantClass = variant === "primary" ? "" : variant;
  const sizeClass = size === "small" ? "small" : "";
  return <button type={type} className={`btn ${variantClass} ${sizeClass} ${className}`.trim()} {...props} />;
}

export function Field({ label, children }: { label: string; children: ReactElement<{ id?: string }> }) {
  const id = useId();
  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      {cloneElement(children, { id })}
    </label>
  );
}

export function Pill({ children, tone, role }: { children: ReactNode; tone?: string; role?: string }) {
  return (
    <span className="pill" data-tone={tone} data-role={role}>
      {children}
    </span>
  );
}

export function LoadingMark() {
  return (
    <div className="loading-screen" role="status">
      FLOWED
    </div>
  );
}
