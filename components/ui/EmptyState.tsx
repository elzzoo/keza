import clsx from "clsx";
import type { ReactNode } from "react";
import { Card } from "./Card";

type EmptyStateProps = {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  tips?: string[];
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ icon, title, description, tips, action, className }: EmptyStateProps) {
  return (
    <Card
      padding="lg"
      className={clsx("mx-auto flex max-w-md flex-col items-center gap-3 text-center", className)}
    >
      {icon && <div className="text-5xl">{icon}</div>}
      <p className="font-bold text-fg">{title}</p>
      {description && <p className="text-sm text-muted">{description}</p>}
      {tips && tips.length > 0 && (
        <ul className="mt-2 self-start text-left text-sm text-muted space-y-1.5 list-disc list-inside">
          {tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      )}
      {action}
    </Card>
  );
}
