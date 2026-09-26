import { AIRPORTS } from "@/data/airports";
import type { Destination } from "@/data/destinations";
import type { MonthlyPrice } from "@/lib/priceHistory";

export type SupportedLang = "fr" | "en";

const MONTH_LABELS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function airportFor(dest: Destination) {
  return AIRPORTS.find((airport) => airport.code === dest.iata);
}

export function destinationCity(dest: Destination, lang: SupportedLang) {
  return lang === "fr" ? dest.city : airportFor(dest)?.cityEn ?? dest.city;
}

export function destinationCountry(dest: Destination, lang: SupportedLang) {
  return lang === "fr" ? dest.country : airportFor(dest)?.countryEn ?? dest.country;
}

export function destinationMonthLabel(month: MonthlyPrice, lang: SupportedLang) {
  return lang === "fr" ? month.monthLabel : MONTH_LABELS_EN[month.month] ?? month.monthLabel;
}
