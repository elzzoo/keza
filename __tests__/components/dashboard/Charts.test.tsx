import { render, screen } from "@testing-library/react";
import { LineChartComponent, BarChartComponent, PieChartComponent } from "@/components/dashboard/Charts";

// Mock Recharts components to avoid rendering issues in tests
jest.mock("recharts", () => {
  const RechartsMock = {
    LineChart: ({ children, data }: { children: any; data: any }) => (
      <div data-testid="line-chart">{children}</div>
    ),
    BarChart: ({ children, data }: { children: any; data: any }) => (
      <div data-testid="bar-chart">{children}</div>
    ),
    PieChart: ({ children }: { children: any }) => (
      <div data-testid="pie-chart">{children}</div>
    ),
    Line: ({ name }: { name: any }) => <div data-testid="line" />,
    Bar: ({ name }: { name: any }) => <div data-testid="bar" />,
    Pie: ({ name }: { name: any }) => <div data-testid="pie" />,
    XAxis: () => <div data-testid="xaxis" />,
    YAxis: () => <div data-testid="yaxis" />,
    CartesianGrid: () => <div data-testid="grid" />,
    Tooltip: () => <div data-testid="tooltip" />,
    Legend: () => <div data-testid="legend" />,
    Cell: () => <div data-testid="cell" />,
    ResponsiveContainer: ({ children }: { children: any }) => (
      <div data-testid="responsive-container">{children}</div>
    ),
  };
  return RechartsMock;
});

describe("Dashboard Chart Components", () => {
  describe("LineChartComponent", () => {
    it("renders with title", () => {
      const mockData = [
        { month: "Jan", value: 100 },
        { month: "Feb", value: 200 },
      ];

      render(
        <LineChartComponent
          title="Sales"
          data={mockData}
          dataKey="value"
          xKey="month"
        />
      );

      expect(screen.getByText("Sales")).toBeInTheDocument();
      expect(screen.getByTestId("line-chart")).toBeInTheDocument();
    });

    it("renders line chart with custom stroke", () => {
      const mockData = [{ month: "Jan", value: 100 }];

      render(
        <LineChartComponent
          title="Revenue"
          data={mockData}
          dataKey="value"
          xKey="month"
          stroke="#ff0000"
        />
      );

      expect(screen.getByTestId("line-chart")).toBeInTheDocument();
    });

    it("renders line chart with custom height", () => {
      const mockData = [{ month: "Jan", value: 100 }];

      render(
        <LineChartComponent
          title="Data"
          data={mockData}
          dataKey="value"
          xKey="month"
          height={500}
        />
      );

      expect(screen.getByTestId("line-chart")).toBeInTheDocument();
    });
  });

  describe("BarChartComponent", () => {
    it("renders with title", () => {
      const mockData = [
        { category: "A", amount: 100 },
        { category: "B", amount: 200 },
      ];

      render(
        <BarChartComponent
          title="Sales by Category"
          data={mockData}
          xKey="category"
          yKey="amount"
        />
      );

      expect(screen.getByText("Sales by Category")).toBeInTheDocument();
      expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
    });

    it("renders bar chart with custom fill", () => {
      const mockData = [{ category: "A", amount: 100 }];

      render(
        <BarChartComponent
          title="Data"
          data={mockData}
          xKey="category"
          yKey="amount"
          fill="#0099ff"
        />
      );

      expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
    });

    it("renders bar chart with custom height", () => {
      const mockData = [{ category: "A", amount: 100 }];

      render(
        <BarChartComponent
          title="Data"
          data={mockData}
          xKey="category"
          yKey="amount"
          height={400}
        />
      );

      expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
    });
  });

  describe("PieChartComponent", () => {
    it("renders with title", () => {
      const mockData = [
        { name: "A", value: 100 },
        { name: "B", value: 200 },
      ];

      render(<PieChartComponent title="Distribution" data={mockData} />);

      expect(screen.getByText("Distribution")).toBeInTheDocument();
      expect(screen.getByTestId("pie-chart")).toBeInTheDocument();
    });

    it("renders pie chart with custom height", () => {
      const mockData = [
        { name: "A", value: 100 },
        { name: "B", value: 200 },
      ];

      render(
        <PieChartComponent
          title="Distribution"
          data={mockData}
          height={350}
        />
      );

      expect(screen.getByTestId("pie-chart")).toBeInTheDocument();
    });

    it("renders pie chart with multiple data points", () => {
      const mockData = [
        { name: "Category A", value: 300 },
        { name: "Category B", value: 200 },
        { name: "Category C", value: 150 },
      ];

      render(<PieChartComponent title="Market Share" data={mockData} />);

      expect(screen.getByText("Market Share")).toBeInTheDocument();
      expect(screen.getByTestId("pie-chart")).toBeInTheDocument();
    });
  });
});
