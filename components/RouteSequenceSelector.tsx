'use client';

import React from 'react';
import { MultiLegRoute } from '@/lib/multiLeg';

interface RouteSequenceSelectorProps {
  routes: MultiLegRoute[];
  onSelect: (route: MultiLegRoute) => void;
  lang?: 'fr' | 'en';
}

/**
 * Component for selecting and displaying multi-leg flight routes
 * Shows route sequence, airlines, prices, and connection times
 * Matches KEZA design system (Tailwind CSS + theme variables)
 */
export function RouteSequenceSelector({ routes, onSelect, lang = 'en' }: RouteSequenceSelectorProps) {
  const fr = lang === 'fr';

  if (routes.length === 0) {
    return (
      <div className="p-6 text-center text-muted">
        <p>{fr ? "Aucune route disponible" : "No routes available"}</p>
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

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-fg">
        {fr ? "Sélectionner un itinéraire" : "Route Sequence"}
      </h2>

      {routes.map((route, routeIndex) => (
        <div
          key={routeIndex}
          className="border border-border rounded-xl p-5 hover:shadow-lg transition-all duration-200 hover:border-primary/50 bg-surface"
        >
          {/* Route sequence visualization */}
          <div className="mb-6 flex items-center gap-3 overflow-x-auto pb-2">
            {route.legs.map((leg, legIndex) => (
              <React.Fragment key={legIndex}>
                {/* Departure airport */}
                <div className="text-center min-w-max">
                  <div className="font-bold text-xl text-fg">{leg.origin}</div>
                  <div className="text-xs text-muted">{formatDate(leg.departureTime)}</div>
                  <div className="text-xs text-muted font-medium">{formatTime(leg.departureTime)}</div>
                </div>

                {/* Connection indicator with airline info */}
                {legIndex < route.legs.length - 1 && (
                  <div className="flex flex-col items-center gap-1 min-w-max px-3">
                    <div className="text-xs font-bold text-primary uppercase tracking-wide">{leg.airline}</div>
                    <div className="text-xs text-muted">{leg.flightNumber}</div>
                    <svg className="w-6 h-4 text-primary" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 12h12M18 9l3 3-3 3" strokeWidth={2} fill="none" stroke="currentColor" strokeLinecap="round" />
                    </svg>
                    <div className="text-xs text-fg font-medium">
                      {calculateConnectionTime(leg.arrivalTime, route.legs[legIndex + 1].departureTime)}m
                    </div>
                  </div>
                )}

                {/* Arrival airport */}
                {legIndex === route.legs.length - 1 && (
                  <div className="text-center min-w-max">
                    <div className="font-bold text-xl text-fg">{leg.destination}</div>
                    <div className="text-xs text-muted">{formatDate(leg.arrivalTime)}</div>
                    <div className="text-xs text-muted font-medium">{formatTime(leg.arrivalTime)}</div>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Leg details */}
          <div className="space-y-2 mb-6 border-t border-b border-border/50 py-4">
            {route.legs.map((leg, legIndex) => (
              <div key={legIndex} className="text-sm bg-surface-2 p-3 rounded-lg">
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <span className="font-bold text-fg">
                      {leg.origin} → {leg.destination}
                    </span>
                    <div className="text-xs text-muted mt-0.5">
                      {leg.airline} {leg.flightNumber} • {leg.aircraft} • {leg.cabin}
                    </div>
                  </div>
                  <div className="text-right font-bold text-fg">{formatPrice(leg.price)}</div>
                </div>
                {legIndex < route.legs.length - 1 && (
                  <div className="text-xs text-orange-600 font-medium mt-1">
                    🔗 {fr ? "Connexion" : "Connection"}: {formatConnectionTime(calculateConnectionTime(leg.arrivalTime, route.legs[legIndex + 1].departureTime))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Route summary */}
          <div className="flex justify-between items-center">
            <div>
              <div className="text-sm text-muted">{fr ? "Prix total" : "Total price"}</div>
              <div className="text-2xl font-bold text-fg">{formatPrice(route.totalPrice)}</div>
              <div className="text-xs text-muted mt-0.5">
                {route.passengers} {route.passengers === 1 ? (fr ? "passager" : "passenger") : (fr ? "passagers" : "passengers")}
              </div>
            </div>
            <button
              onClick={() => onSelect(route)}
              className="px-6 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary/80 transition-colors shadow-sm hover:shadow-md"
            >
              {fr ? "Réserver" : "Book Now"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
