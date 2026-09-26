export function isAutomaticBalanceSyncEnabled(): boolean {
  return process.env.BALANCE_SYNC_ENABLED === "true";
}

export const BALANCE_SYNC_NOT_CONFIGURED = {
  error: "Automatic airline balance sync is not configured yet. Enter balances manually.",
  code: "BALANCE_SYNC_NOT_CONFIGURED",
};
