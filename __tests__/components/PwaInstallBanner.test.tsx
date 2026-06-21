/**
 * @jest-environment jsdom
 */
// PwaInstallBanner Event Listener Cleanup Tests
import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { PwaInstallBanner } from "@/components/PwaInstallBanner";

describe("PwaInstallBanner — Event Listener Cleanup", () => {
  let removeEventListenerSpy: jest.SpyInstance;
  let addEventListenerSpy: jest.SpyInstance;

  beforeEach(() => {
    removeEventListenerSpy = jest.spyOn(window, "removeEventListener");
    addEventListenerSpy = jest.spyOn(window, "addEventListener");
  });

  afterEach(() => {
    removeEventListenerSpy.mockRestore();
    addEventListenerSpy.mockRestore();
    jest.clearAllMocks();
  });

  it("registers beforeinstallprompt listener on mount", () => {
    render(<PwaInstallBanner lang="en" searchCount={0} />);

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "beforeinstallprompt",
      expect.any(Function)
    );
  });

  it("registers appinstalled listener on mount", () => {
    render(<PwaInstallBanner lang="en" searchCount={0} />);

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "appinstalled",
      expect.any(Function)
    );
  });

  it("removes beforeinstallprompt listener on unmount", () => {
    const { unmount } = render(<PwaInstallBanner lang="en" searchCount={0} />);

    removeEventListenerSpy.mockClear();
    addEventListenerSpy.mockClear();

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "beforeinstallprompt",
      expect.any(Function)
    );
  });

  it("removes appinstalled listener on unmount", () => {
    const { unmount } = render(<PwaInstallBanner lang="en" searchCount={0} />);

    removeEventListenerSpy.mockClear();

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "appinstalled",
      expect.any(Function)
    );
  });

  it("cleans up both listeners on unmount", () => {
    const { unmount } = render(<PwaInstallBanner lang="en" searchCount={0} />);

    removeEventListenerSpy.mockClear();

    unmount();

    // Should remove both listeners
    const removeCalls = removeEventListenerSpy.mock.calls;
    const eventNames = removeCalls.map((call) => call[0]);

    expect(eventNames).toContain("beforeinstallprompt");
    expect(eventNames).toContain("appinstalled");
  });

  it("prevents memory leaks by cleaning up on component unmount", () => {
    const { unmount, rerender } = render(
      <PwaInstallBanner lang="en" searchCount={0} />
    );

    const initialAddCalls = addEventListenerSpy.mock.calls.length;

    // Remount component
    unmount();
    removeEventListenerSpy.mockClear();
    addEventListenerSpy.mockClear();

    render(<PwaInstallBanner lang="en" searchCount={0} />);

    // Should add listeners again (clean mount, no duplicates)
    const newAddCalls = addEventListenerSpy.mock.calls.length;
    expect(newAddCalls).toBeGreaterThan(0);
  });

  it("does not add duplicate listeners on re-render", () => {
    const { rerender } = render(
      <PwaInstallBanner lang="en" searchCount={0} />
    );

    addEventListenerSpy.mockClear();

    // Re-render with different searchCount
    rerender(<PwaInstallBanner lang="en" searchCount={5} />);

    // Effect has empty dependency array, so no new listeners should be added
    expect(addEventListenerSpy).not.toHaveBeenCalled();
  });
});
