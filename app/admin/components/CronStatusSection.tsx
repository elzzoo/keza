import type { DailyCronStatus } from "@/lib/cronStatus";
import { cronHealthColor, cronHealthLabel, formatDate } from "../format";
import { StatCard } from "./StatCard";

export function CronStatusSection({ cronStatus }: { cronStatus: DailyCronStatus }) {
  return (
    <div className="mt-8">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-700">
        Crons Daily
      </h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Santé"
          value={cronHealthLabel(cronStatus.health)}
          sub={cronStatus.lastRun?.runId ? `run ${cronStatus.lastRun.runId.slice(0, 8)}` : "aucun run enregistré"}
          color={cronHealthColor(cronStatus.health)}
        />
        <StatCard
          label="Dernier dispatch"
          value={cronStatus.lastRun ? "✅" : "—"}
          sub={formatDate(cronStatus.lastRun?.startedAt ?? null)}
          color={cronStatus.lastRun ? "green" : "amber"}
        />
        <StatCard
          label="Jobs suivis"
          value={cronStatus.jobs.length}
          sub={`${cronStatus.jobs.filter((job) => job.state?.status === "accepted").length} accepté(s)`}
          color="blue"
        />
      </div>
      <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="grid grid-cols-[1fr_auto_auto] gap-3 border-b border-gray-100 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
          <span>Job</span>
          <span>Status</span>
          <span>Code</span>
        </div>
        {cronStatus.jobs.map((job) => (
          <div
            key={job.path}
            className="grid grid-cols-[1fr_auto_auto] gap-3 border-b border-gray-100 px-4 py-2 text-sm last:border-b-0"
          >
            <span className="truncate text-gray-700">{job.path}</span>
            <span className="font-medium text-gray-900">{job.state?.status ?? "pending"}</span>
            <span className="text-gray-500">{job.state?.statusCode ?? "—"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
