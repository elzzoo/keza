import clsx from "clsx";
import type { HTMLAttributes } from "react";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  padding?: "none" | "sm" | "md" | "lg";
  interactive?: boolean;
};

const paddingClasses = {
  none: "",
  sm: "p-3",
  md: "p-4 sm:p-5",
  lg: "p-6",
};

export function Card({ padding = "md", interactive = false, className, ...props }: CardProps) {
  return (
    <div
      {...props}
      className={clsx(
        "rounded-xl border border-border bg-surface shadow-card",
        interactive && "transition-all duration-150 hover:border-primary/30 hover:shadow-card-hover",
        paddingClasses[padding],
        className
      )}
    />
  );
}
