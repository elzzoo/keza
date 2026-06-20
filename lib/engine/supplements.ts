import "server-only";
import type { NormalizedFlight } from "../promotions/engine";
import { iataToAirline } from "../iataAirlines";
import { TP_BASE, buildAviasalesUrl } from "./travelpayouts";
import type { Cabin, TripType, FlightResult } from "./types";
import { CABIN_MULTIPLIER } from "./types";

// ─── Home Carrier Guarantee ──────────────────────────────────────────────────
// Last-resort guarantee: after all providers are processed, if NONE of the
// listed programs appear in ANY result's milesOptions, the engine injects a
// synthetic entry for the home airline so the miles calculation still runs.
//
// Fixes B2/B3/B4: Duffel test data is randomized — SQ/NH/JL/EK may or may not
// appear in any given request. This map ensures their programs are ALWAYS present
// on the corridors where they dominate, regardless of provider data quality.
//
// Key format: "ORIGIN-DEST" (uppercase). Both directions listed.
// airline: exact name in iataAirlines.ts. programs: program names to check.
export const HOME_CARRIER_PROGRAMS: Record<string, { airline: string; programs: string[] }[]> = {
  // Singapore Airlines — KrisFlyer (SIN hub)
  "SIN-LAX": [{ airline: "Singapore Airlines", programs: ["Singapore KrisFlyer"] }],
  "LAX-SIN": [{ airline: "Singapore Airlines", programs: ["Singapore KrisFlyer"] }],
  "SIN-JFK": [{ airline: "Singapore Airlines", programs: ["Singapore KrisFlyer"] }],
  "JFK-SIN": [{ airline: "Singapore Airlines", programs: ["Singapore KrisFlyer"] }],
  "SIN-SFO": [{ airline: "Singapore Airlines", programs: ["Singapore KrisFlyer"] }],
  "SFO-SIN": [{ airline: "Singapore Airlines", programs: ["Singapore KrisFlyer"] }],
  "SIN-LHR": [{ airline: "Singapore Airlines", programs: ["Singapore KrisFlyer"] }],
  "LHR-SIN": [{ airline: "Singapore Airlines", programs: ["Singapore KrisFlyer"] }],

  // ANA + JAL — NRT/HND hub outbound
  "NRT-LAX": [{ airline: "All Nippon Airways", programs: ["ANA Mileage Club"] }, { airline: "Japan Airlines", programs: ["Japan Airlines Mileage Bank"] }],
  "LAX-NRT": [{ airline: "All Nippon Airways", programs: ["ANA Mileage Club"] }, { airline: "Japan Airlines", programs: ["Japan Airlines Mileage Bank"] }],
  "HND-LAX": [{ airline: "All Nippon Airways", programs: ["ANA Mileage Club"] }, { airline: "Japan Airlines", programs: ["Japan Airlines Mileage Bank"] }],
  "LAX-HND": [{ airline: "All Nippon Airways", programs: ["ANA Mileage Club"] }, { airline: "Japan Airlines", programs: ["Japan Airlines Mileage Bank"] }],
  "NRT-JFK": [{ airline: "All Nippon Airways", programs: ["ANA Mileage Club"] }, { airline: "Japan Airlines", programs: ["Japan Airlines Mileage Bank"] }],
  "JFK-NRT": [{ airline: "All Nippon Airways", programs: ["ANA Mileage Club"] }, { airline: "Japan Airlines", programs: ["Japan Airlines Mileage Bank"] }],
  "NRT-SFO": [{ airline: "All Nippon Airways", programs: ["ANA Mileage Club"] }, { airline: "Japan Airlines", programs: ["Japan Airlines Mileage Bank"] }],
  "SFO-NRT": [{ airline: "All Nippon Airways", programs: ["ANA Mileage Club"] }, { airline: "Japan Airlines", programs: ["Japan Airlines Mileage Bank"] }],
  "NRT-ORD": [{ airline: "All Nippon Airways", programs: ["ANA Mileage Club"] }, { airline: "Japan Airlines", programs: ["Japan Airlines Mileage Bank"] }],
  "ORD-NRT": [{ airline: "All Nippon Airways", programs: ["ANA Mileage Club"] }, { airline: "Japan Airlines", programs: ["Japan Airlines Mileage Bank"] }],

  // Emirates Skywards — DXB hub
  "DXB-LHR": [{ airline: "Emirates", programs: ["Emirates Skywards"] }],
  "LHR-DXB": [{ airline: "Emirates", programs: ["Emirates Skywards"] }],
  "DXB-JFK": [{ airline: "Emirates", programs: ["Emirates Skywards"] }],
  "JFK-DXB": [{ airline: "Emirates", programs: ["Emirates Skywards"] }],
  "DXB-CDG": [{ airline: "Emirates", programs: ["Emirates Skywards"] }],
  "CDG-DXB": [{ airline: "Emirates", programs: ["Emirates Skywards"] }],
  "DXB-FRA": [{ airline: "Emirates", programs: ["Emirates Skywards"] }],
  "FRA-DXB": [{ airline: "Emirates", programs: ["Emirates Skywards"] }],
  "DXB-LAX": [{ airline: "Emirates", programs: ["Emirates Skywards"] }],
  "LAX-DXB": [{ airline: "Emirates", programs: ["Emirates Skywards"] }],
  "DXB-SYD": [{ airline: "Emirates", programs: ["Emirates Skywards"] }],
  "SYD-DXB": [{ airline: "Emirates", programs: ["Emirates Skywards"] }],
  "DXB-BKK": [{ airline: "Emirates", programs: ["Emirates Skywards"] }],
  "BKK-DXB": [{ airline: "Emirates", programs: ["Emirates Skywards"] }],

  // Etihad Guest — AUH (Abu Dhabi) hub
  "AUH-LHR": [{ airline: "Etihad", programs: ["Etihad Guest"] }],
  "LHR-AUH": [{ airline: "Etihad", programs: ["Etihad Guest"] }],
  "AUH-JFK": [{ airline: "Etihad", programs: ["Etihad Guest"] }],
  "JFK-AUH": [{ airline: "Etihad", programs: ["Etihad Guest"] }],
  "AUH-CDG": [{ airline: "Etihad", programs: ["Etihad Guest"] }],
  "CDG-AUH": [{ airline: "Etihad", programs: ["Etihad Guest"] }],
  "AUH-LAX": [{ airline: "Etihad", programs: ["Etihad Guest"] }],
  "LAX-AUH": [{ airline: "Etihad", programs: ["Etihad Guest"] }],
  "AUH-BKK": [{ airline: "Etihad", programs: ["Etihad Guest"] }],
  "BKK-AUH": [{ airline: "Thai Airways", programs: ["Thai Royal Orchid Plus"] }],
  "AUH-SYD": [{ airline: "Etihad", programs: ["Etihad Guest"] }],
  "SYD-AUH": [{ airline: "Qantas", programs: ["Qantas Frequent Flyer"] }],

  // Qatar Privilege Club — DOH hub
  "DOH-LHR": [{ airline: "Qatar Airways", programs: ["Qatar Privilege Club"] }],
  "LHR-DOH": [{ airline: "Qatar Airways", programs: ["Qatar Privilege Club"] }],
  "DOH-JFK": [{ airline: "Qatar Airways", programs: ["Qatar Privilege Club"] }],
  "JFK-DOH": [{ airline: "Qatar Airways", programs: ["Qatar Privilege Club"] }],
  "DOH-CDG": [{ airline: "Qatar Airways", programs: ["Qatar Privilege Club"] }],
  "CDG-DOH": [{ airline: "Qatar Airways", programs: ["Qatar Privilege Club"] }],
  "DOH-LAX": [{ airline: "Qatar Airways", programs: ["Qatar Privilege Club"] }],
  "LAX-DOH": [{ airline: "Qatar Airways", programs: ["Qatar Privilege Club"] }],
  "DOH-BKK": [{ airline: "Qatar Airways", programs: ["Qatar Privilege Club"] }],
  "BKK-DOH": [{ airline: "Thai Airways", programs: ["Thai Royal Orchid Plus"] }],

  // Korean Air SKYPASS — ICN (Seoul) hub
  "ICN-LAX": [{ airline: "Korean Air", programs: ["Korean Air SKYPASS"] }],
  "LAX-ICN": [{ airline: "Korean Air", programs: ["Korean Air SKYPASS"] }],
  "ICN-JFK": [{ airline: "Korean Air", programs: ["Korean Air SKYPASS"] }],
  "JFK-ICN": [{ airline: "Korean Air", programs: ["Korean Air SKYPASS"] }],

  // Cathay Pacific Asia Miles — HKG hub
  "HKG-LHR": [{ airline: "Cathay Pacific", programs: ["Cathay Pacific Asia Miles"] }],
  "LHR-HKG": [{ airline: "Cathay Pacific", programs: ["Cathay Pacific Asia Miles"] }],
  "HKG-JFK": [{ airline: "Cathay Pacific", programs: ["Cathay Pacific Asia Miles"] }],
  "JFK-HKG": [{ airline: "Cathay Pacific", programs: ["Cathay Pacific Asia Miles"] }],
  "HKG-LAX": [{ airline: "Cathay Pacific", programs: ["Cathay Pacific Asia Miles"] }],
  "LAX-HKG": [{ airline: "Cathay Pacific", programs: ["Cathay Pacific Asia Miles"] }],
  "HKG-SYD": [{ airline: "Cathay Pacific", programs: ["Cathay Pacific Asia Miles"] }],
  "SYD-HKG": [{ airline: "Qantas", programs: ["Qantas Frequent Flyer"] }],

  // Turkish Miles&Smiles — IST hub
  "IST-JFK": [{ airline: "Turkish Airlines", programs: ["Turkish Miles&Smiles"] }],
  "JFK-IST": [{ airline: "Turkish Airlines", programs: ["Turkish Miles&Smiles"] }],
  "IST-LAX": [{ airline: "Turkish Airlines", programs: ["Turkish Miles&Smiles"] }],
  "LAX-IST": [{ airline: "Turkish Airlines", programs: ["Turkish Miles&Smiles"] }],
  "IST-LHR": [{ airline: "Turkish Airlines", programs: ["Turkish Miles&Smiles"] }],
  "LHR-IST": [{ airline: "Turkish Airlines", programs: ["Turkish Miles&Smiles"] }],
  "IST-CDG": [{ airline: "Turkish Airlines", programs: ["Turkish Miles&Smiles"] }],
  "CDG-IST": [{ airline: "Turkish Airlines", programs: ["Turkish Miles&Smiles"] }],

  // Malaysia Airlines Enrich — KUL hub
  "KUL-LHR": [{ airline: "Malaysia Airlines", programs: ["Malaysia Airlines Enrich"] }],
  "LHR-KUL": [{ airline: "Malaysia Airlines", programs: ["Malaysia Airlines Enrich"] }],
  "KUL-LAX": [{ airline: "Malaysia Airlines", programs: ["Malaysia Airlines Enrich"] }],
  "LAX-KUL": [{ airline: "Malaysia Airlines", programs: ["Malaysia Airlines Enrich"] }],

  // Ethiopian ShebaMiles — ADD hub (Addis Ababa)
  // Guaranteed: if Duffel + TP both miss, ShebaMiles still appears on ADD corridors.
  "ADD-LHR": [{ airline: "Ethiopian Airlines", programs: ["Ethiopian ShebaMiles"] }],
  "LHR-ADD": [{ airline: "Ethiopian Airlines", programs: ["Ethiopian ShebaMiles"] }],
  "ADD-CDG": [{ airline: "Ethiopian Airlines", programs: ["Ethiopian ShebaMiles"] }],
  "CDG-ADD": [{ airline: "Ethiopian Airlines", programs: ["Ethiopian ShebaMiles"] }],
  "ADD-JFK": [{ airline: "Ethiopian Airlines", programs: ["Ethiopian ShebaMiles"] }],
  "JFK-ADD": [{ airline: "Ethiopian Airlines", programs: ["Ethiopian ShebaMiles"] }],
  "ADD-DXB": [{ airline: "Ethiopian Airlines", programs: ["Ethiopian ShebaMiles"] }],
  "DXB-ADD": [{ airline: "Ethiopian Airlines", programs: ["Ethiopian ShebaMiles"] }],
  "ADD-FRA": [{ airline: "Ethiopian Airlines", programs: ["Ethiopian ShebaMiles"] }],
  "FRA-ADD": [{ airline: "Ethiopian Airlines", programs: ["Ethiopian ShebaMiles"] }],
  "ADD-AMS": [{ airline: "Ethiopian Airlines", programs: ["Ethiopian ShebaMiles"] }],
  "AMS-ADD": [{ airline: "Ethiopian Airlines", programs: ["Ethiopian ShebaMiles"] }],

  // Kenya Airways Flying Blue — NBO hub (Nairobi)
  // KQ is SkyTeam → Flying Blue applies on NBO corridors
  "NBO-LHR": [{ airline: "Kenya Airways", programs: ["Flying Blue"] }],
  "LHR-NBO": [{ airline: "Kenya Airways", programs: ["Flying Blue"] }],
  "NBO-CDG": [{ airline: "Kenya Airways", programs: ["Flying Blue"] }],
  "CDG-NBO": [{ airline: "Kenya Airways", programs: ["Flying Blue"] }],
  "NBO-JFK": [{ airline: "Kenya Airways", programs: ["Flying Blue"] }],
  "JFK-NBO": [{ airline: "Kenya Airways", programs: ["Flying Blue"] }],
  "NBO-AMS": [{ airline: "Kenya Airways", programs: ["Flying Blue"] }],
  "AMS-NBO": [{ airline: "Kenya Airways", programs: ["Flying Blue"] }],
  "NBO-FRA": [{ airline: "Kenya Airways", programs: ["Flying Blue"] }],
  "FRA-NBO": [{ airline: "Kenya Airways", programs: ["Flying Blue"] }],

  // Royal Air Maroc Safar Flyer — CMN hub (Casablanca) — P5 Task 1.5
  "CMN-CDG": [{ airline: "Royal Air Maroc", programs: ["Royal Air Maroc Safar Flyer"] }],
  "CDG-CMN": [{ airline: "Royal Air Maroc", programs: ["Royal Air Maroc Safar Flyer"] }],
  "CMN-LAX": [{ airline: "Royal Air Maroc", programs: ["Royal Air Maroc Safar Flyer"] }],
  "LAX-CMN": [{ airline: "Royal Air Maroc", programs: ["Royal Air Maroc Safar Flyer"] }],
  "CMN-JFK": [{ airline: "Royal Air Maroc", programs: ["Royal Air Maroc Safar Flyer"] }],
  "JFK-CMN": [{ airline: "Royal Air Maroc", programs: ["Royal Air Maroc Safar Flyer"] }],
  "CMN-LHR": [{ airline: "Royal Air Maroc", programs: ["Royal Air Maroc Safar Flyer"] }],
  "LHR-CMN": [{ airline: "Royal Air Maroc", programs: ["Royal Air Maroc Safar Flyer"] }],

  // South African Voyager — JNB hub (Johannesburg) — P5 Task 1.5 — NEW
  "JNB-LHR": [{ airline: "South African Airways", programs: ["South African Voyager"] }],
  "LHR-JNB": [{ airline: "South African Airways", programs: ["South African Voyager"] }],
  "JNB-CDG": [{ airline: "South African Airways", programs: ["South African Voyager"] }],
  "CDG-JNB": [{ airline: "South African Airways", programs: ["South African Voyager"] }],
  "JNB-FRA": [{ airline: "South African Airways", programs: ["South African Voyager"] }],
  "FRA-JNB": [{ airline: "South African Airways", programs: ["South African Voyager"] }],
  "JNB-LAX": [{ airline: "South African Airways", programs: ["South African Voyager"] }],
  "LAX-JNB": [{ airline: "South African Airways", programs: ["South African Voyager"] }],
  "JNB-JFK": [{ airline: "South African Airways", programs: ["South African Voyager"] }],
  "JFK-JNB": [{ airline: "South African Airways", programs: ["South African Voyager"] }],

  // RwandAir — KGL hub (Kigali)
  "KGL-LHR": [{ airline: "RwandAir", programs: ["British Airways Avios"] }],
  "LHR-KGL": [{ airline: "RwandAir", programs: ["British Airways Avios"] }],
  "KGL-CDG": [{ airline: "RwandAir", programs: ["Flying Blue"] }],
  "CDG-KGL": [{ airline: "RwandAir", programs: ["Flying Blue"] }],
  "KGL-BRU": [{ airline: "RwandAir", programs: ["Flying Blue"] }],
  "BRU-KGL": [{ airline: "RwandAir", programs: ["Flying Blue"] }],

  // ─── P5 Scaling Task 1.2: Asia Hub Extensions ───────────────────────────────
  // HKG: Add SFO and CDG corridors (other HKG routes already covered in P3)
  "HKG-SFO": [{ airline: "Cathay Pacific", programs: ["Cathay Pacific Asia Miles"] }],
  "SFO-HKG": [{ airline: "Cathay Pacific", programs: ["Cathay Pacific Asia Miles"] }],
  "HKG-CDG": [{ airline: "Cathay Pacific", programs: ["Cathay Pacific Asia Miles"] }],
  "CDG-HKG": [{ airline: "Cathay Pacific", programs: ["Cathay Pacific Asia Miles"] }],

  // Thai Airways Royal Orchid Plus — BKK hub (Bangkok) — NEW
  "BKK-LAX": [{ airline: "Thai Airways", programs: ["Thai Royal Orchid Plus"] }],
  "LAX-BKK": [{ airline: "Thai Airways", programs: ["Thai Royal Orchid Plus"] }],
  "BKK-CDG": [{ airline: "Thai Airways", programs: ["Thai Royal Orchid Plus"] }],
  "CDG-BKK": [{ airline: "Air France", programs: ["Flying Blue"] }],
  "BKK-NRT": [{ airline: "Thai Airways", programs: ["Thai Royal Orchid Plus"] }],
  "NRT-BKK": [{ airline: "Japan Airlines", programs: ["Japan Airlines Mileage Bank"] }],

  // ─── Europe Hubs (P5 Scaling Task 1.1) ───────────────────────────────────────
  // Lufthansa Miles & More — FRA hub (Frankfurt)
  "FRA-LAX": [{ airline: "Lufthansa", programs: ["Lufthansa Miles & More"] }],
  "LAX-FRA": [{ airline: "Lufthansa", programs: ["Lufthansa Miles & More"] }],
  "FRA-JFK": [{ airline: "Lufthansa", programs: ["Lufthansa Miles & More"] }],
  "JFK-FRA": [{ airline: "Lufthansa", programs: ["Lufthansa Miles & More"] }],
  "FRA-CDG": [{ airline: "Lufthansa", programs: ["Lufthansa Miles & More"] }],
  "CDG-FRA": [{ airline: "Lufthansa", programs: ["Lufthansa Miles & More"] }],

  // KLM Flying Blue — AMS hub (Amsterdam)
  "AMS-LAX": [{ airline: "KLM", programs: ["Flying Blue"] }],
  "LAX-AMS": [{ airline: "KLM", programs: ["Flying Blue"] }],
  "AMS-CDG": [{ airline: "KLM", programs: ["Flying Blue"] }],
  "CDG-AMS": [{ airline: "KLM", programs: ["Flying Blue"] }],

  // British Airways Avios — LHR hub (London)
  "LHR-LAX": [{ airline: "British Airways", programs: ["British Airways Avios"] }],
  "LAX-LHR": [{ airline: "British Airways", programs: ["British Airways Avios"] }],
  "LHR-JFK": [{ airline: "British Airways", programs: ["British Airways Avios"] }],
  "JFK-LHR": [{ airline: "British Airways", programs: ["British Airways Avios"] }],
  "LHR-SFO": [{ airline: "British Airways", programs: ["British Airways Avios"] }],
  "SFO-LHR": [{ airline: "British Airways", programs: ["British Airways Avios"] }],
  "LHR-CDG": [{ airline: "Air France", programs: ["Flying Blue"] }],
  "CDG-LHR": [{ airline: "Air France", programs: ["Flying Blue"] }],
  "LHR-FRA": [{ airline: "Lufthansa", programs: ["Lufthansa Miles & More"] }],
  "FRA-LHR": [{ airline: "Lufthansa", programs: ["Lufthansa Miles & More"] }],
  "LHR-AMS": [{ airline: "KLM", programs: ["Flying Blue"] }],
  "AMS-LHR": [{ airline: "KLM", programs: ["Flying Blue"] }],

  // ─── P5 Scaling Task 1.4: US Hub Expansion (MIA, ORD) ────────────────────
  // Miami hub — South America + Transatlantic
  "MIA-GRU": [{ airline: "LATAM Airlines", programs: ["LATAM Pass"] }],
  "GRU-MIA": [{ airline: "LATAM Airlines", programs: ["LATAM Pass"] }],
  "MIA-EZE": [{ airline: "LATAM Airlines", programs: ["LATAM Pass"] }],
  "EZE-MIA": [{ airline: "LATAM Airlines", programs: ["LATAM Pass"] }],
  "MIA-BOG": [{ airline: "Copa Airlines", programs: ["COPA ConnectMiles"] }],
  "BOG-MIA": [{ airline: "Copa Airlines", programs: ["COPA ConnectMiles"] }],

  // Miami ↔ Europe
  "MIA-LHR": [{ airline: "British Airways", programs: ["British Airways Avios"] }],
  "LHR-MIA": [{ airline: "British Airways", programs: ["British Airways Avios"] }],
  "MIA-CDG": [{ airline: "Air France", programs: ["Flying Blue"] }],
  "CDG-MIA": [{ airline: "Air France", programs: ["Flying Blue"] }],

  // Miami ↔ US West Coast
  "MIA-SFO": [{ airline: "United", programs: ["United MileagePlus"] }],
  "SFO-MIA": [{ airline: "United", programs: ["United MileagePlus"] }],

  // Chicago hub — Transatlantic (ORD-NRT already exists for Asia hub)
  "ORD-LHR": [{ airline: "British Airways", programs: ["British Airways Avios"] }],
  "LHR-ORD": [{ airline: "British Airways", programs: ["British Airways Avios"] }],
  "ORD-CDG": [{ airline: "Air France", programs: ["Flying Blue"] }],
  "CDG-ORD": [{ airline: "Air France", programs: ["Flying Blue"] }],
  "ORD-FRA": [{ airline: "Lufthansa", programs: ["Lufthansa Miles & More"] }],
  "FRA-ORD": [{ airline: "Lufthansa", programs: ["Lufthansa Miles & More"] }],
};

// ─── Static airline supplements ──────────────────────────────────────────────
// Travelpayouts doesn't index many African/regional carriers (Air Senegal,
// Transair, etc.) because they don't distribute through GDS/OTAs.
// This map injects known carriers for specific routes so the cost engine can
// show the right miles programs (e.g. Flying Blue for Air France partner routes).
//
// Key format: "ORIGIN-DEST" (canonical, uppercase). Both directions are listed.
// Values are airline NAMES (as used in iataAirlines.ts / alliances.ts).
// DO NOT add carriers you're unsure about — better to under-report than mislead.
export const ROUTE_AIRLINE_SUPPLEMENTS: Record<string, string[]> = {
  // West Africa ↔ Europe
  "DSS-CDG": ["Air Senegal", "Air France", "Corsair"],
  "CDG-DSS": ["Air Senegal", "Air France", "Corsair"],
  "DSS-LHR": ["Air Senegal"],
  "LHR-DSS": ["Air Senegal"],

  "LOS-CDG": ["Air France"],
  "CDG-LOS": ["Air France"],
  "LOS-LHR": ["British Airways"],
  "LHR-LOS": ["British Airways"],
  "LOS-FRA": ["Lufthansa"],
  "FRA-LOS": ["Lufthansa"],

  "ABJ-CDG": ["Air France"],
  "CDG-ABJ": ["Air France"],
  "ACC-LHR": ["British Airways"],
  "LHR-ACC": ["British Airways"],
  "CMN-CDG": ["Royal Air Maroc", "Air France"],
  "CDG-CMN": ["Royal Air Maroc", "Air France"],

  // East / Southern Africa ↔ Europe
  "NBO-LHR": ["British Airways", "Kenya Airways"],
  "LHR-NBO": ["British Airways", "Kenya Airways"],
  "NBO-CDG": ["Air France", "Kenya Airways"],
  "CDG-NBO": ["Air France", "Kenya Airways"],
  "JNB-LHR": ["British Airways", "South African Airways"],
  "LHR-JNB": ["British Airways", "South African Airways"],
  "ADD-CDG": ["Ethiopian Airlines", "Air France"],
  "CDG-ADD": ["Ethiopian Airlines", "Air France"],

  // West Africa ↔ North America (often via European hubs)
  "DSS-JFK": ["Air Senegal", "Air France"],
  "JFK-DSS": ["Air Senegal", "Air France"],
  "LOS-JFK": ["United"],
  "JFK-LOS": ["United"],

  // South Africa ↔ Europe (JNB + CPT)
  "JNB-CDG": ["Air France", "South African Airways"],
  "CDG-JNB": ["Air France", "South African Airways"],
  "JNB-FRA": ["Lufthansa", "South African Airways"],
  "FRA-JNB": ["Lufthansa", "South African Airways"],
  "CPT-LHR": ["British Airways", "South African Airways"],
  "LHR-CPT": ["British Airways", "South African Airways"],
  "CPT-CDG": ["Air France", "South African Airways"],
  "CDG-CPT": ["Air France", "South African Airways"],
  "CPT-FRA": ["Lufthansa", "South African Airways"],
  "FRA-CPT": ["Lufthansa", "South African Airways"],

  // South Africa ↔ North America
  "JNB-JFK": ["South African Airways", "United"],
  "JFK-JNB": ["South African Airways", "United"],
  "JNB-LAX": ["South African Airways", "United"],
  "LAX-JNB": ["South African Airways", "United"],

  // West Africa ↔ Europe — Accra
  "ACC-CDG": ["Air France"],
  "CDG-ACC": ["Air France"],
  // ACC-LHR / LHR-ACC already defined above — no duplicate needed.

  // East Africa ↔ Europe (additional routes)
  "ADD-LHR": ["Ethiopian Airlines", "British Airways"],
  "LHR-ADD": ["Ethiopian Airlines", "British Airways"],
  "NBO-FRA": ["Lufthansa", "Kenya Airways"],
  "FRA-NBO": ["Lufthansa", "Kenya Airways"],

  // Kigali ↔ Europe (RwandAir hub)
  "KGL-LHR": ["RwandAir", "British Airways"],
  "LHR-KGL": ["RwandAir", "British Airways"],
  "KGL-CDG": ["RwandAir", "Air France"],
  "CDG-KGL": ["RwandAir", "Air France"],
  "KGL-BRU": ["RwandAir", "Brussels Airlines"],
  "BRU-KGL": ["RwandAir", "Brussels Airlines"],

  // ── Asia–Americas (B2 fix: KrisFlyer absent on SIN→LAX) ──────────────────
  // Singapore Airlines operates SIN-LAX direct (SQ37/SQ38).
  // KrisFlyer is the primary program but rarely surfaces via Travelpayouts.
  "SIN-LAX": ["Singapore Airlines"],
  "LAX-SIN": ["Singapore Airlines"],
  "SIN-JFK": ["Singapore Airlines"],
  "JFK-SIN": ["Singapore Airlines"],
  "SIN-SFO": ["Singapore Airlines"],
  "SFO-SIN": ["Singapore Airlines"],

  // ── Japan–Americas (B3 fix: ANA + JAL absent on NRT→LAX) ─────────────────
  // ANA (NH) and JAL (JL) are the two primary Japanese carriers.
  // Both operate NRT/HND–LAX/JFK/SFO and codeshare extensively on Star/Oneworld.
  "NRT-LAX": ["All Nippon Airways", "Japan Airlines"],
  "LAX-NRT": ["All Nippon Airways", "Japan Airlines"],
  "NRT-JFK": ["All Nippon Airways", "Japan Airlines"],
  "JFK-NRT": ["All Nippon Airways", "Japan Airlines"],
  "NRT-SFO": ["All Nippon Airways", "Japan Airlines"],
  "SFO-NRT": ["All Nippon Airways", "Japan Airlines"],
  "NRT-ORD": ["All Nippon Airways", "Japan Airlines"],
  "ORD-NRT": ["All Nippon Airways", "Japan Airlines"],
  "HND-LAX": ["All Nippon Airways", "Japan Airlines"],
  "LAX-HND": ["All Nippon Airways", "Japan Airlines"],
  "HND-JFK": ["All Nippon Airways", "Japan Airlines"],
  "JFK-HND": ["All Nippon Airways", "Japan Airlines"],

  // ── Gulf–Europe/Americas (B4 fix: Emirates Skywards absent on DXB routes) ──
  // Emirates operates DXB→LHR, DXB→JFK, DXB→CDG etc. directly (EK).
  // Skywards is the dominant redemption program in the Gulf region.
  "DXB-LHR": ["Emirates"],
  "LHR-DXB": ["Emirates"],
  "DXB-JFK": ["Emirates"],
  "JFK-DXB": ["Emirates"],
  "DXB-CDG": ["Emirates", "Air France"],
  "CDG-DXB": ["Emirates", "Air France"],
  "DXB-FRA": ["Emirates", "Lufthansa"],
  "FRA-DXB": ["Emirates", "Lufthansa"],
  "DXB-LAX": ["Emirates"],
  "LAX-DXB": ["Emirates"],
  "DXB-SYD": ["Emirates"],
  "SYD-DXB": ["Emirates"],
  "DXB-BKK": ["Emirates"],
  "BKK-DXB": ["Emirates"],

  // ── Etihad (AUH hub) ─────────────────────────────────────────────────────
  "AUH-LHR": ["Etihad"],
  "LHR-AUH": ["Etihad"],
  "AUH-JFK": ["Etihad"],
  "JFK-AUH": ["Etihad"],
  "AUH-CDG": ["Etihad"],
  "CDG-AUH": ["Etihad"],
  "AUH-LAX": ["Etihad", "United"],
  "LAX-AUH": ["Etihad", "United"],
  "AUH-BKK": ["Etihad", "Thai Airways"],
  "BKK-AUH": ["Thai Airways", "Etihad"],
  "AUH-SYD": ["Etihad", "Qantas"],
  "SYD-AUH": ["Qantas", "Etihad"],

  // ── Qatar Airways (DOH hub) ──────────────────────────────────────────────
  "DOH-LHR": ["Qatar Airways"],
  "LHR-DOH": ["Qatar Airways"],
  "DOH-JFK": ["Qatar Airways"],
  "JFK-DOH": ["Qatar Airways"],
  "DOH-CDG": ["Qatar Airways"],
  "CDG-DOH": ["Qatar Airways"],
  "DOH-LAX": ["Qatar Airways"],
  "LAX-DOH": ["Qatar Airways"],
  "DOH-BKK": ["Qatar Airways", "Thai Airways"],
  "BKK-DOH": ["Thai Airways", "Qatar Airways"],

  // ── Korean Air (ICN hub) ─────────────────────────────────────────────────
  "ICN-LAX": ["Korean Air"],
  "LAX-ICN": ["Korean Air"],
  "ICN-JFK": ["Korean Air"],
  "JFK-ICN": ["Korean Air"],

  // ── Cathay Pacific (HKG hub) ─────────────────────────────────────────────
  "HKG-LHR": ["Cathay Pacific"],
  "LHR-HKG": ["Cathay Pacific"],
  "HKG-JFK": ["Cathay Pacific"],
  "JFK-HKG": ["Cathay Pacific"],
  "HKG-LAX": ["Cathay Pacific"],
  "LAX-HKG": ["Cathay Pacific"],
  "HKG-SFO": ["Cathay Pacific"],
  "SFO-HKG": ["Cathay Pacific"],
  "HKG-CDG": ["Cathay Pacific"],
  "CDG-HKG": ["Cathay Pacific"],
  "HKG-SYD": ["Cathay Pacific"],
  "SYD-HKG": ["Qantas"],

  // ── Turkish Airlines (IST hub) ───────────────────────────────────────────
  "IST-JFK": ["Turkish Airlines"],
  "JFK-IST": ["Turkish Airlines"],
  "IST-LAX": ["Turkish Airlines"],
  "LAX-IST": ["Turkish Airlines"],
  "IST-LHR": ["Turkish Airlines"],
  "LHR-IST": ["Turkish Airlines"],
  "IST-CDG": ["Turkish Airlines"],
  "CDG-IST": ["Turkish Airlines"],

  // ── Malaysia Airlines (KUL hub) ──────────────────────────────────────────
  "KUL-LHR": ["Malaysia Airlines"],
  "LHR-KUL": ["Malaysia Airlines"],
  "KUL-LAX": ["Malaysia Airlines"],
  "LAX-KUL": ["Malaysia Airlines"],

  // ── Royal Air Maroc (CMN hub) ────────────────────────────────────────────
  "CMN-JFK": ["Royal Air Maroc"],
  "JFK-CMN": ["Royal Air Maroc"],
  "CMN-LAX": ["Royal Air Maroc"],
  "LAX-CMN": ["Royal Air Maroc"],

  // ── Asia–Europe additional ───────────────────────────────────────────────
  "CDG-BKK": ["Air France", "Thai Airways"],
  "BKK-CDG": ["Air France", "Thai Airways"],
  "LAX-BKK": ["Thai Airways"],
  "BKK-LAX": ["Thai Airways"],
  "NRT-SYD": ["All Nippon Airways", "Japan Airlines"],
  "SYD-NRT": ["All Nippon Airways", "Japan Airlines"],
  "NRT-BKK": ["Japan Airlines", "Thai Airways"],
  "BKK-NRT": ["Japan Airlines", "Thai Airways"],

  // ── Americas – South America (M3 fix: LATAM absent on MIA→GRU) ──────────
  // LATAM Airlines and Copa operate these routes. getCorridorGuarantees()
  // already injects LATAM Pass for SOUTH_AMERICA zone; supplements ensure
  // the airline injection fires even when TP doesn't return airline codes.
  "MIA-GRU": ["LATAM Airlines", "Copa Airlines"],
  "GRU-MIA": ["LATAM Airlines", "Copa Airlines"],
  "MIA-EZE": ["LATAM Airlines", "Copa Airlines"],
  "EZE-MIA": ["LATAM Airlines", "Copa Airlines"],
  "MIA-BOG": ["Copa Airlines", "LATAM Airlines"],
  "BOG-MIA": ["Copa Airlines", "LATAM Airlines"],
  "JFK-GRU": ["LATAM Airlines"],
  "GRU-JFK": ["LATAM Airlines"],
  "CDG-GRU": ["Air France", "LATAM Airlines"],
  "GRU-CDG": ["Air France", "LATAM Airlines"],

  // ── Europe Hubs (P5 Scaling Task 1.1) ───────────────────────────────────────
  // Lufthansa (FRA hub)
  "FRA-LAX": ["Lufthansa", "United"],
  "LAX-FRA": ["Lufthansa", "United"],
  "FRA-JFK": ["Lufthansa", "United"],
  "JFK-FRA": ["Lufthansa", "United"],
  "FRA-CDG": ["Lufthansa", "Air France"],
  "CDG-FRA": ["Lufthansa", "Air France"],

  // KLM (AMS hub)
  "AMS-LAX": ["KLM", "United"],
  "LAX-AMS": ["KLM", "United"],
  "AMS-CDG": ["KLM", "Air France"],
  "CDG-AMS": ["KLM", "Air France"],

  // British Airways (LHR hub)
  "LHR-LAX": ["British Airways", "United"],
  "LAX-LHR": ["British Airways", "United"],
  "LHR-JFK": ["British Airways", "United"],
  "JFK-LHR": ["British Airways", "United"],
  "LHR-SFO": ["British Airways", "United"],
  "SFO-LHR": ["British Airways", "United"],
  "LHR-CDG": ["British Airways", "Air France"],
  "CDG-LHR": ["Air France", "British Airways"],
  "LHR-FRA": ["British Airways", "Lufthansa"],
  "FRA-LHR": ["Lufthansa", "British Airways"],
  "LHR-AMS": ["British Airways", "KLM"],
  "AMS-LHR": ["KLM", "British Airways"],
  "LHR-SIN": ["British Airways", "Singapore Airlines"],
  "SIN-LHR": ["Singapore Airlines", "British Airways"],
  "LHR-NRT": ["British Airways", "All Nippon Airways"],
  "NRT-LHR": ["All Nippon Airways", "British Airways"],

  // ── P5 Scaling Task 1.4: US Hub Expansion (MIA, ORD) ─────────────────────
  // Miami — Europe routes (South America routes already in M3 fix section above)
  "MIA-LHR": ["British Airways", "American Airlines"],
  "LHR-MIA": ["British Airways", "American Airlines"],
  "MIA-CDG": ["Air France", "American Airlines"],
  "CDG-MIA": ["Air France", "American Airlines"],

  // Miami — West Coast (United hub)
  "MIA-SFO": ["United", "American Airlines"],
  "SFO-MIA": ["United", "American Airlines"],

  // Chicago — Transatlantic (ORD-NRT already exists above)
  "ORD-LHR": ["British Airways", "United", "American Airlines"],
  "LHR-ORD": ["British Airways", "United", "American Airlines"],
  "ORD-CDG": ["Air France", "United", "American Airlines"],
  "CDG-ORD": ["Air France", "United", "American Airlines"],
  "ORD-FRA": ["Lufthansa", "United", "American Airlines"],
  "FRA-ORD": ["Lufthansa", "United", "American Airlines"],
};

/**
 * Discover airlines that operate a route by querying v3 WITHOUT a date filter.
 * Merges Travelpayouts data with static supplements for routes with poor GDS coverage
 * (primarily African carriers that don't distribute through OTAs).
 */
export async function discoverRouteAirlines(
  attempts: Array<[string, string]>,
  token: string
): Promise<string[]> {
  // Check static supplements first (keyed by first attempt = canonical code pair)
  const [primaryFrom, primaryTo] = attempts[0] ?? ["", ""];
  const supplementKey = `${primaryFrom.toUpperCase()}-${primaryTo.toUpperCase()}`;
  const supplements = ROUTE_AIRLINE_SUPPLEMENTS[supplementKey] ?? [];

  for (const [o, d] of attempts) {
    const url = new URL(`${TP_BASE}/aviasales/v3/prices_for_dates`);
    url.searchParams.set("origin", o.toUpperCase());
    url.searchParams.set("destination", d.toUpperCase());
    url.searchParams.set("currency", "usd");
    url.searchParams.set("sorting", "price");
    url.searchParams.set("unique", "true");   // one per airline
    url.searchParams.set("limit", "10");
    url.searchParams.set("token", token);

    try {
      const res = await fetch(url.toString(), {
        next: { revalidate: 86400 },          // cache 24h — airline roster changes slowly
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(4000),
      });
      if (!res.ok) continue;
      const json = (await res.json()) as { data?: Array<{ airline: string }> };
      if (Array.isArray(json.data) && json.data.length > 0) {
        const fromApi = json.data
          .map((f) => iataToAirline(f.airline))
          .filter((n): n is string => n !== null);  // skip virtual ZZ/YP/ZG codes
        // Merge API result with supplements — deduplicated, supplements appended
        const merged = Array.from(new Set([...fromApi, ...supplements]));
        return merged;
      }
    } catch { /* try next attempt pair */ }
  }

  // Travelpayouts returned nothing — return supplements only so the cost engine
  // can still compute miles options for the known carriers on this route.
  return supplements;
}

// ─── Enrich a synthetic flight (no miles calculation) ────────────────────────
// Synthetic flights are airlines we know serve a route but whose prices are not
// in any provider index. We show them as "Vol direct disponible" with an
// indicative price range (~min – min×1.3). They are NOT ranked with real
// flights and receive NO miles options.

export function enrichSynthetic(
  f: NormalizedFlight,
  cabin: Cabin,
  passengers: number,
  tripType: TripType,
  searchDate?: string,
  returnDate?: string,
): FlightResult {
  // Synthetics are built from the cheapest TP price (economy base).
  // If that cheapest price came from a Duffel flight (cabinResolved=true),
  // it already reflects the requested cabin — don't double-apply the multiplier.
  const multiplier    = f.cabinResolved ? 1 : CABIN_MULTIPLIER[cabin];
  const outboundPrice = Math.round(f.price * multiplier * 100) / 100;
  // For roundtrips, double the price (synthetic has no real return leg — we mirror
  // the outbound as a best estimate). Same logic as real roundtrips in enrich().
  const legCount      = tripType === "roundtrip" ? 2 : 1;
  const totalPrice    = Math.round(outboundPrice * legCount * passengers * 100) / 100;

  const result: FlightResult = {
    from:    f.from,
    to:      f.to,
    price:   outboundPrice,
    airlines: f.airlines,
    stops:    f.stops ?? 0,
    duration: f.duration,
    tripType,
    cabin,
    passengers,
    totalPrice,
    cashCost:            totalPrice,
    milesCost:           0,
    savings:             0,
    recommendation:      "USE_CASH",
    bestOption:          null,
    milesOptions:        [],
    explanation:         "Prix indicatif — vol direct disponible",
    displayMessage:      "💵 Prix indicatif",
    disclaimer:          "Prix estimé, non garanti",
    cabinPriceEstimated: !f.cabinResolved && cabin !== "economy",
    searchId:            "",   // filled by caller
    optimization:        { type: "CASH" },
    isSupplemental:      true,
    source:              "SYNTHETIC",
    priceConfidence:     "ESTIMATED",
  };

  if (tripType === "roundtrip" && searchDate && returnDate && f.from && f.to) {
    result.bookingLink = buildAviasalesUrl(f.from, f.to, searchDate, returnDate, passengers);
  } else if (searchDate && f.from && f.to) {
    result.bookingLink = buildAviasalesUrl(f.from, f.to, searchDate, undefined, passengers);
  }

  return result;
}
