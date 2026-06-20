"use client";

import { DealScore } from "@/lib/dealScorer";
import Link from "next/link";

export interface DealRecommendationWidgetProps {
  deals: DealScore[];
  maxDeals?: number;
}

export function DealRecommendationWidget({
  deals,
  maxDeals = 3,
}: DealRecommendationWidgetProps) {
  const topDeals = deals.slice(0, maxDeals);

  if (topDeals.length === 0) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-600">
        No deals available right now. Check back soon!
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="font-bold text-lg">Recommended Deals</h3>
      {topDeals.map((deal) => (
        <div
          key={deal.route}
          className={`p-4 rounded-lg border-2 ${
            deal.score >= 0.85
              ? "border-green-500 bg-green-50"
              : "border-blue-300 bg-blue-50"
          }`}
        >
          <div className="flex justify-between items-start mb-2">
            <div>
              <h4 className="font-semibold text-lg">{deal.route}</h4>
              <p className="text-sm text-gray-700">{deal.recommendation}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-green-600">
                ${deal.currentPrice.toLocaleString()}
              </p>
              <p className="text-sm font-bold text-green-700">
                Save {deal.discount.toFixed(1)}%
              </p>
            </div>
          </div>

          <div className="flex justify-between items-center text-xs text-gray-600 mb-3 pb-3 border-b">
            <span>Usually: ${deal.historicalAvg.toLocaleString()}</span>
            {deal.hasSufficientMiles && (
              <span className="text-green-700 font-medium">
                ✓ You have miles
              </span>
            )}
          </div>

          <Link href={`/search?route=${deal.route}`}>
            <button className="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700">
              Book Now
            </button>
          </Link>
        </div>
      ))}
    </div>
  );
}
