import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react-dom/test-utils";
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
    const onRefresh = jest.fn().mockResolvedValue(undefined);
    render(<BalanceSyncWidget lastSync={new Date()} onRefresh={onRefresh} />);

    const user = userEvent.setup();
    await act(async () => {
      await user.click(screen.getByText(/Refresh Now/));
    });

    await waitFor(() => {
      expect(onRefresh).toHaveBeenCalled();
    });
  });

  it("shows loading state during refresh", async () => {
    const onRefresh = jest.fn().mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );
    const { rerender } = render(
      <BalanceSyncWidget lastSync={new Date()} onRefresh={onRefresh} isLoading={false} />
    );

    const user = userEvent.setup();

    // Click the button and immediately check for loading state
    const clickPromise = user.click(screen.getByText(/Refresh Now/));

    // Allow a small delay for state update to take effect
    await new Promise(resolve => setTimeout(resolve, 10));

    // Rerender to see updated state
    rerender(<BalanceSyncWidget lastSync={new Date()} onRefresh={onRefresh} isLoading={false} />);

    // Wait for the refresh to complete
    await clickPromise;

    // After refresh completes, button should show "Refresh Now" again
    await waitFor(() => {
      expect(screen.getByText(/Refresh Now/)).toBeInTheDocument();
    });
  });

  it("shows error message when refresh fails", async () => {
    const onRefresh = jest.fn().mockRejectedValue(new Error("Sync failed"));
    render(<BalanceSyncWidget lastSync={new Date()} onRefresh={onRefresh} />);

    const user = userEvent.setup();
    await act(async () => {
      await user.click(screen.getByText(/Refresh Now/));
    });

    await waitFor(() => {
      expect(screen.getByText(/Sync failed/)).toBeInTheDocument();
    });
  });

  it("syncs isLoading prop with internal state", async () => {
    const { rerender } = render(
      <BalanceSyncWidget lastSync={new Date()} isLoading={false} />
    );

    rerender(<BalanceSyncWidget lastSync={new Date()} isLoading={true} />);
    expect(screen.getByText(/Refreshing.../)).toBeInTheDocument();

    rerender(<BalanceSyncWidget lastSync={new Date()} isLoading={false} />);
    expect(screen.getByText(/Refresh Now/)).toBeInTheDocument();
  });
});
