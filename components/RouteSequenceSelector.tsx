'use client';

import React from 'react';
import { MultiLegRoute } from '@/lib/multiLeg';

interface RouteSequenceSelectorProps {
  routes: MultiLegRoute[];
  onSelect: (route: MultiLegRoute) => void;
}

/**
 * Component for selecting and displaying multi-leg flight routes
 * Shows route sequence, airlines, prices, and connection times
 */
export function RouteSequenceSelector({ routes, onSelect }: RouteSequenceSelectorProps) {
  if (routes.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>No routes available</p>
      </div>
    );
  }

  const formatTime = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const calculateConnectionTime = (arrivalTime: string, departureTime: string): number => {
    const arrival = new Date(arrivalTime).getTime();
    const departure = new Date(departureTime).getTime();
    return Math.round((departure - arrival) / (1000 * 60));
  };

  const formatConnectionTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours === 0) {
      return `${mins}m`;
    }
    if (mins === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">Route Sequence</h2>

      {routes.map((route, routeIndex) => (
        <div key={routeIndex} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
          {/* Route sequence visualization */}
          <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-2">
            {route.legs.map((leg, legIndex) => (
              <React.Fragment key={legIndex}>
                <div className="text-center min-w-max">
                  <div className="font-bold text-lg text-gray-900">{leg.origin}</div>
                  <div className="text-xs text-gray-500">{formatDate(leg.departureTime)}</div>
                  <div className="text-xs text-gray-500">{formatTime(leg.departureTime)}</div>
                </div>

                {/* Arrow between airports */}
                {legIndex < route.legs.length - 1 && (
                  <div className="flex flex-col items-center gap-1 min-w-max px-2">
                    <div className="text-xs font-medium text-blue-600">{leg.airline}</div>
                    <div className="text-xs text-gray-600">{leg.flightNumber}</div>
                    <div className="text-xs text-gray-600">{leg.aircraft}</div>
                    <svg className="w-8 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <div className="text-xs text-gray-600 font-medium">
                      {calculateConnectionTime(leg.arrivalTime, route.legs[legIndex + 1].departureTime)} min
                    </div>
                  </div>
                )}

                {/* Arrival airport */}
                {legIndex === route.legs.length - 1 && (
                  <div className="text-center min-w-max">
                    <div className="font-bold text-lg text-gray-900">{leg.destination}</div>
                    <div className="text-xs text-gray-500">{formatDate(leg.arrivalTime)}</div>
                    <div className="text-xs text-gray-500">{formatTime(leg.arrivalTime)}</div>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Leg details */}
          <div className="space-y-2 mb-4">
            {route.legs.map((leg, legIndex) => (
              <div key={legIndex} className="text-sm bg-gray-50 p-3 rounded">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="font-medium text-gray-900">
                      {leg.origin} → {leg.destination}
                    </span>
                    <div className="text-xs text-gray-600">
                      {leg.airline} {leg.flightNumber} • {leg.aircraft} • {leg.cabin}
                    </div>
                  </div>
                  <div className="text-right font-medium text-gray-900">${leg.price}</div>
                </div>
                {legIndex < route.legs.length - 1 && (
                  <div className="text-xs text-orange-600">
                    ✈ Connection: {formatConnectionTime(calculateConnectionTime(leg.arrivalTime, route.legs[legIndex + 1].departureTime))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Route summary */}
          <div className="flex justify-between items-center pt-4 border-t border-gray-200">
            <div>
              <div className="text-sm text-gray-600">Total Price</div>
              <div className="text-2xl font-bold text-gray-900">${route.totalPrice}</div>
              <div className="text-xs text-gray-500">{route.passengers} passenger(s)</div>
            </div>
            <button
              onClick={() => onSelect(route)}
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Book Now
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
