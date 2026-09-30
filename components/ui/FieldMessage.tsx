import clsx from "clsx";
import type { HTMLAttributes } from "react";

type FieldMessageTone = "warning" | "danger" | "success" | "neutral";

type FieldMessageProps = HTMLAttributes<HTMLDivElement> & {
  tone?: FieldMessageTone;
};

const toneClasses: Record<FieldMessageTone, string> = {
  warning: "border-warning/25 bg-warning/10 text-warning",
  danger: "border-danger/20 bg-danger text-white",
  success: "border-success/20 bg-success/10 text-success",
  neutral: "border-border bg-surface-2 text-muted",
};

export function FieldMessage({ tone = "neutral", className, ...props }: FieldMessageProps) {
  return (
    <div
      role={props.role ?? "status"}
      {...props}
      className={clsx("rounded-xl border px-4 py-3 text-sm font-medium", toneClasses[tone], className)}
    />
  );
}
