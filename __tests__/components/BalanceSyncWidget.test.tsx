import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BalanceSyncWidget } from "@/components/BalanceSyncWidget";

describe("BalanceSyncWidget", () => {
  it("displays last synced time", () => {
    const lastSync = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
    render(<BalanceSyncWidget lastSync={lastSync} />);
    expect(screen.getByText(/Last synced.*2 hours ago/)).toBeInTheDocument();
  });

  it("shows warning if balance >24h old", () => {
    const lastSync = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
    render(<BalanceSyncWidget lastSync={lastSync} />);
    expect(screen.getByText(/Balance data is stale/)).toBeInTheDocument();
  });

  it("triggers manual refresh on button click", async () => {
    const onRefresh = jest.fn();
    render(<BalanceSyncWidget lastSync={new Date()} onRefresh={onRefresh} />);

    fireEvent.click(screen.getByText(/Refresh Now/));

    await waitFor(() => {
      expect(onRefresh).toHaveBeenCalled();
    });
  });

  it("shows loading state during refresh", async () => {
    const { rerender } = render(
      <BalanceSyncWidget lastSync={new Date()} isLoading={false} />
    );
    fireEvent.click(screen.getByText(/Refresh Now/));

    rerender(<BalanceSyncWidget lastSync={new Date()} isLoading={true} />);
    expect(screen.getByText(/Refreshing.../)).toBeInTheDocument();
  });
});
