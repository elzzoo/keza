import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { RouteSequenceSelector } from '@/components/RouteSequenceSelector';
import { MultiLegRoute, FlightLeg } from '@/lib/multiLeg';

describe('RouteSequenceSelector Component', () => {
  const mockLeg1: FlightLeg = {
    origin: 'JFK',
    destination: 'ORD',
    departureTime: '2025-08-01T06:00:00Z',
    arrivalTime: '2025-08-01T09:00:00Z',
    airline: 'UA',
    flightNumber: 'UA1234',
    aircraft: '737',
    cabin: 'economy',
    price: 120,
  };

  const mockLeg2: FlightLeg = {
    origin: 'ORD',
    destination: 'LAX',
    departureTime: '2025-08-01T11:30:00Z',
    arrivalTime: '2025-08-01T14:00:00Z',
    airline: 'UA',
    flightNumber: 'UA5678',
    aircraft: '777',
    cabin: 'economy',
    price: 180,
  };

  const mockRoute: MultiLegRoute = {
    legs: [mockLeg1, mockLeg2],
    totalPrice: 300,
    passengers: 1,
  };

  const mockRoutes: MultiLegRoute[] = [mockRoute];

  it('should render component with routes', () => {
    const onSelect = jest.fn();
    render(<RouteSequenceSelector routes={mockRoutes} onSelect={onSelect} />);
    expect(screen.getByText(/Route Sequence/i)).toBeInTheDocument();
  });

  it('should display route sequence with all legs', () => {
    const onSelect = jest.fn();
    const { container } = render(<RouteSequenceSelector routes={mockRoutes} onSelect={onSelect} />);
    expect(container.textContent).toContain('JFK');
    expect(container.textContent).toContain('ORD');
    expect(container.textContent).toContain('LAX');
  });

  it('should show airline and flight numbers', () => {
    const onSelect = jest.fn();
    const { container } = render(<RouteSequenceSelector routes={mockRoutes} onSelect={onSelect} />);
    expect(container.textContent).toContain('UA');
    expect(container.textContent).toContain('UA1234');
    expect(container.textContent).toContain('UA5678');
  });

  it('should display total price', () => {
    const onSelect = jest.fn();
    const { container } = render(<RouteSequenceSelector routes={mockRoutes} onSelect={onSelect} />);
    expect(container.textContent).toContain('$300');
  });

  it('should display connection time between legs', () => {
    const onSelect = jest.fn();
    render(<RouteSequenceSelector routes={mockRoutes} onSelect={onSelect} />);
    // Connection time is from 09:00 to 11:30 = 2.5 hours
    expect(screen.getByText(/connection/i)).toBeInTheDocument();
  });

  it('should have Book Now button', () => {
    const onSelect = jest.fn();
    render(<RouteSequenceSelector routes={mockRoutes} onSelect={onSelect} />);
    const bookButton = screen.getByText(/Book Now/i);
    expect(bookButton).toBeInTheDocument();
  });

  it('should call onSelect when Book Now is clicked', () => {
    const onSelect = jest.fn();
    render(<RouteSequenceSelector routes={mockRoutes} onSelect={onSelect} />);
    const bookButton = screen.getByText(/Book Now/i);
    fireEvent.click(bookButton);
    expect(onSelect).toHaveBeenCalledWith(mockRoute);
  });

  it('should display multiple routes', () => {
    const route2: MultiLegRoute = {
      legs: [
        {
          origin: 'JFK',
          destination: 'LAX',
          departureTime: '2025-08-01T08:00:00Z',
          arrivalTime: '2025-08-01T16:00:00Z',
          airline: 'AA',
          flightNumber: 'AA100',
          aircraft: '777',
          cabin: 'economy',
          price: 250,
        },
      ],
      totalPrice: 250,
      passengers: 1,
    };

    const onSelect = jest.fn();
    const { container } = render(<RouteSequenceSelector routes={[mockRoute, route2]} onSelect={onSelect} />);

    // Both prices should be visible
    expect(container.textContent).toContain('$300');
    expect(container.textContent).toContain('$250');
  });

  it('should render empty state when no routes provided', () => {
    const onSelect = jest.fn();
    render(<RouteSequenceSelector routes={[]} onSelect={onSelect} />);
    expect(screen.getByText(/No routes available/i)).toBeInTheDocument();
  });

  it('should display cabin class for each leg', () => {
    const onSelect = jest.fn();
    const { container } = render(<RouteSequenceSelector routes={mockRoutes} onSelect={onSelect} />);
    expect(container.textContent).toContain('economy');
  });

  it('should handle single-leg routes', () => {
    const singleLegRoute: MultiLegRoute = {
      legs: [
        {
          origin: 'JFK',
          destination: 'LAX',
          departureTime: '2025-08-01T08:00:00Z',
          arrivalTime: '2025-08-01T16:00:00Z',
          airline: 'UA',
          flightNumber: 'UA500',
          aircraft: '777',
          cabin: 'economy',
          price: 350,
        },
      ],
      totalPrice: 350,
      passengers: 1,
    };

    const onSelect = jest.fn();
    const { container } = render(<RouteSequenceSelector routes={[singleLegRoute]} onSelect={onSelect} />);
    expect(container.textContent).toContain('JFK');
    expect(container.textContent).toContain('LAX');
  });

  it('should show aircraft type', () => {
    const onSelect = jest.fn();
    render(<RouteSequenceSelector routes={mockRoutes} onSelect={onSelect} />);
    const content = screen.getByText(/Route Sequence/i).parentElement?.textContent || '';
    expect(content).toContain('737');
    expect(content).toContain('777');
  });
});
