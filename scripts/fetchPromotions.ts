import fs from "fs";
import path from "path";

// Seed promotions — in production this would scrape real sources
const promos = [
  { airline: "Air France", discount: 0.15 },
  { airline: "KLM", discount: 0.10 },
  { airline: "Emirates", discount: 0.20 },
  { airline: "Qatar Airways", discount: 0.12 },
  { airline: "Turkish Airlines", discount: 0.18 },
  { airline: "Lufthansa", discount: 0.08 },
  { airline: "British Airways", discount: 0.10 },
  { airline: "Ethiopian Airlines", discount: 0.05 },
  { airline: "Kenya Airways", discount: 0.07 },
  { airline: "Royal Air Maroc", discount: 0.12 },
];

const outPath = path.join(process.cwd(), "data", "promotions.json");
fs.writeFileSync(outPath, JSON.stringify(promos, null, 2));
console.log(`[fetchPromotions] wrote ${promos.length} promos to ${outPath}`);
