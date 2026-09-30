"use client";

import clsx from "clsx";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg" | "icon";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white hover:bg-primary-hover shadow-blue disabled:hover:bg-primary",
  secondary: "border border-border bg-surface-2 text-fg hover:border-subtle hover:bg-surface disabled:hover:bg-surface-2",
  ghost: "text-muted hover:text-fg hover:bg-surface-2 disabled:hover:bg-transparent",
  danger: "border border-danger/25 bg-danger/10 text-danger hover:bg-danger/15 disabled:hover:bg-danger/10",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3 py-1.5 text-xs rounded-lg",
  md: "min-h-10 px-4 py-2 text-sm rounded-xl",
  lg: "min-h-11 px-5 py-3 text-base sm:text-sm rounded-2xl",
  icon: "h-9 w-9 p-0 rounded-lg",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  leftIcon,
  rightIcon,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      {...props}
      disabled={isDisabled}
      className={clsx(
        "inline-flex items-center justify-center gap-2 font-semibold transition-all duration-150",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        "disabled:cursor-not-allowed disabled:opacity-45",
        "active:enabled:scale-[0.99]",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
    >
      {loading && (
        <span
          aria-hidden="true"
          className="h-4 w-4 rounded-full border-2 border-current/30 border-t-current animate-spin"
        />
      )}
      {!loading && leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
}
