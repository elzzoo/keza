import clsx from "clsx";
import type { HTMLAttributes } from "react";

type BadgeTone = "neutral" | "primary" | "success" | "warning" | "danger";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
};

const toneClasses: Record<BadgeTone, string> = {
  neutral: "border-border bg-surface-2 text-muted",
  primary: "border-primary/25 bg-primary/10 text-primary",
  success: "border-success/20 bg-success/10 text-success",
  warning: "border-warning/25 bg-warning/10 text-warning",
  danger: "border-danger/25 bg-danger/10 text-danger",
};

export function Badge({ tone = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      {...props}
      className={clsx(
        "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold leading-none",
        toneClasses[tone],
        className
      )}
    />
  );
}
