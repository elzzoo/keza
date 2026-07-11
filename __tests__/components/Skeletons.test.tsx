import { render, screen } from "@testing-library/react";
import { CalendarSkeleton, MapSkeleton, ProgramListSkeleton } from "@/components/Skeletons";

/**
 * Suspense Fallback Skeletons Tests
 * Tests for CalendarSkeleton, MapSkeleton, and ProgramListSkeleton
 * Part of P0 Phase 4: Code Splitting
 */

describe("Suspense Fallback Skeletons", () => {
  describe("CalendarSkeleton", () => {
    it("should render without errors", () => {
      const { container } = render(<CalendarSkeleton />);
      expect(container).toBeInTheDocument();
    });

    it("should render a container with proper styling", () => {
      const { container } = render(<CalendarSkeleton />);
      const skeletonDiv = container.querySelector(".bg-surface");
      expect(skeletonDiv).toBeInTheDocument();
    });

    it("should include calendar grid structure", () => {
      const { container } = render(<CalendarSkeleton />);
      const gridElements = container.querySelectorAll(".grid");
      expect(gridElements.length).toBeGreaterThan(0);
    });

    it("should have rounded corners and border", () => {
      const { container } = render(<CalendarSkeleton />);
      const skeleton = container.querySelector(".rounded-2xl");
      expect(skeleton).toBeInTheDocument();
    });

    it("should include pulse animation", () => {
      const { container } = render(<CalendarSkeleton />);
      const animated = container.querySelector(".animate-pulse");
      expect(animated).toBeInTheDocument();
    });
  });

  describe("MapSkeleton", () => {
    it("should render without errors", () => {
      const { container } = render(<MapSkeleton />);
      expect(container).toBeInTheDocument();
    });

    it("should render a container with proper sizing", () => {
      const { container } = render(<MapSkeleton />);
      const surface = container.querySelector(".bg-surface");
      expect(surface).toBeInTheDocument();
    });

    it("should have rounded corners", () => {
      const { container } = render(<MapSkeleton />);
      const skeleton = container.querySelector(".rounded-2xl");
      expect(skeleton).toBeInTheDocument();
    });

    it("should have appropriate height for map", () => {
      const { container } = render(<MapSkeleton />);
      const innerDiv = container.querySelector(".bg-surface");
      expect(innerDiv).toHaveClass("min-h-96");
    });

    it("should include pulse animation", () => {
      const { container } = render(<MapSkeleton />);
      const animated = container.querySelector(".animate-pulse");
      expect(animated).toBeInTheDocument();
    });
  });

  describe("ProgramListSkeleton", () => {
    it("should render without errors", () => {
      const { container } = render(<ProgramListSkeleton />);
      expect(container).toBeInTheDocument();
    });

    it("should render multiple skeleton items", () => {
      const { container } = render(<ProgramListSkeleton />);
      const items = container.querySelectorAll(".space-y-3 > div");
      expect(items.length).toBeGreaterThan(0);
    });

    it("should render container with proper spacing", () => {
      const { container } = render(<ProgramListSkeleton />);
      const spacer = container.querySelector(".space-y-3");
      expect(spacer).toBeInTheDocument();
    });

    it("should have rounded corners on items", () => {
      const { container } = render(<ProgramListSkeleton />);
      const rounded = container.querySelector(".rounded-2xl");
      expect(rounded).toBeInTheDocument();
    });

    it("should include pulse animation", () => {
      const { container } = render(<ProgramListSkeleton />);
      const animated = container.querySelector(".animate-pulse");
      expect(animated).toBeInTheDocument();
    });

    it("should render at least 3 program items", () => {
      const { container } = render(<ProgramListSkeleton />);
      const items = container.querySelectorAll("[class*='rounded']");
      expect(items.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("All Skeletons", () => {
    it("should all use Tailwind classes for styling", () => {
      const { container: calendarContainer } = render(<CalendarSkeleton />);
      const { container: mapContainer } = render(<MapSkeleton />);
      const { container: programContainer } = render(<ProgramListSkeleton />);

      expect(calendarContainer.innerHTML).toMatch(/class=/);
      expect(mapContainer.innerHTML).toMatch(/class=/);
      expect(programContainer.innerHTML).toMatch(/class=/);
    });
  });
});
