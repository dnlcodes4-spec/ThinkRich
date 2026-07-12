import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type Variant =
  | "primary"
  | "accent"
  | "secondary"
  | "ghost"
  | "destructive"
  | "link";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-md font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50";

const variantClasses: Record<Variant, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary-hover",
  accent: "bg-accent text-accent-foreground hover:bg-accent-hover",
  secondary: "border border-ring bg-transparent text-foreground hover:bg-surface-muted",
  ghost: "bg-transparent text-primary hover:bg-primary/10",
  destructive: "border border-danger/50 bg-transparent text-danger hover:bg-danger-soft",
  link: "bg-transparent text-primary underline-offset-4 hover:underline",
};

// md is the 44px touch-target default; link opts out of min-height/padding.
const sizeClasses: Record<Size, string> = {
  sm: "min-h-9 px-3 text-sm",
  md: "min-h-11 px-4 text-sm",
  lg: "min-h-12 px-5 text-base",
};

type ButtonProps = ComponentProps<"button"> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
};

function Spinner() {
  return (
    <svg
      className="size-4 motion-safe:animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  type = "button",
  disabled,
  className,
  children,
  ref,
  ...props
}: ButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        base,
        variantClasses[variant],
        variant === "link" ? "min-h-0 px-0" : sizeClasses[size],
        className,
      )}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}
