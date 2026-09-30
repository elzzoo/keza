import clsx from "clsx";
import type { ComponentPropsWithoutRef, ElementType } from "react";

type CardOwnProps<T extends ElementType> = {
  as?: T;
  padding?: "none" | "sm" | "md" | "lg";
  interactive?: boolean;
};

type CardProps<T extends ElementType> = CardOwnProps<T> &
  Omit<ComponentPropsWithoutRef<T>, keyof CardOwnProps<T>>;

const paddingClasses = {
  none: "",
  sm: "p-3",
  md: "p-4 sm:p-5",
  lg: "p-6",
};

export function Card<T extends ElementType = "div">({
  as,
  padding = "md",
  interactive = false,
  className,
  ...props
}: CardProps<T>) {
  const Component = as ?? "div";

  return (
    <Component
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
