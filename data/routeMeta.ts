// ─── Route Metadata ─────────────────────────────────────────────────────────
// Rich metadata layer for all KEZA routes: duration, airlines, best programs,
// season tips, and approximate miles needed for economy/business.

export interface RouteMeta {
  durationMin: number;        // typical flight duration in minutes (one way, shortest realistic)
  airlines: string[];         // main airlines operating this route
  bestPrograms: string[];     // best miles programs for this route (top 3)
  seasonTip: { fr: string; en: string }; // best season to travel
  milesToEconomy: number;     // approximate miles needed economy (round number)
  milesToBusiness: number;    // approximate miles needed business
  isNonstop: boolean;         // nonstop available?
  hub?: string;               // main connecting hub if not nonstop
}

export const ROUTE_META = new Map<string, RouteMeta>([

  // ── Africa ↔ Europe ─────────────────────────────────────────────────────

  ["DSS-CDG", {
    durationMin: 390,
    airlines: ["Air France", "Air Sénégal"],
    bestPrograms: ["Flying Blue", "Miles&Smiles", "Avios"],
    seasonTip: {
      fr: "Évitez juillet-août (haute saison, prix élevés). Octobre-novembre offre le meilleur rapport qualité/prix.",
      en: "Avoid July-August (peak season, high prices). October-November offers the best value.",
    },
    milesToEconomy: 25000,
    milesToBusiness: 60000,
    isNonstop: true,
  }],

  ["ABJ-CDG", {
    durationMin: 360,
    airlines: ["Air France"],
    bestPrograms: ["Flying Blue", "Miles&Smiles", "Avios"],
    seasonTip: {
      fr: "Décembre-janvier (saison sèche) est idéal. Évitez les vacances scolaires françaises pour de meilleurs tarifs.",
      en: "December-January (dry season) is ideal. Avoid French school holidays for better fares.",
    },
    milesToEconomy: 25000,
    milesToBusiness: 60000,
    isNonstop: true,
  }],

  ["LOS-LHR", {
    durationMin: 390,
    airlines: ["British Airways", "Virgin Atlantic"],
    bestPrograms: ["Avios", "Virgin Points", "Flying Blue"],
    seasonTip: {
      fr: "Novembre-mars est la basse saison au Nigeria et offre les meilleurs tarifs vers Londres.",
      en: "November-March is low season in Nigeria and offers the best fares to London.",
    },
    milesToEconomy: 25000,
    milesToBusiness: 62500,
    isNonstop: true,
  }],

  ["CMN-CDG", {
    durationMin: 165,
    airlines: ["Royal Air Maroc", "Air France"],
    bestPrograms: ["Flying Blue", "Safar", "Avios"],
    seasonTip: {
      fr: "Printemps (avril-mai) et automne (septembre-octobre) sont les meilleures saisons. Évitez l'été et le Ramadan.",
      en: "Spring (April-May) and autumn (September-October) are the best seasons. Avoid summer and Ramadan.",
    },
    milesToEconomy: 15000,
    milesToBusiness: 40000,
    isNonstop: true,
  }],

  ["NBO-CDG", {
    durationMin: 540,
    airlines: ["Kenya Airways", "Air France"],
    bestPrograms: ["Flying Blue", "Miles&Smiles", "Skywards"],
    seasonTip: {
      fr: "Janvier-février et juin-septembre (saison sèche) sont parfaits. Les prix grimpent pendant les safaris d'été.",
      en: "January-February and June-September (dry season) are ideal. Prices rise during summer safari season.",
    },
    milesToEconomy: 35000,
    milesToBusiness: 70000,
    isNonstop: true,
  }],

  ["ACC-LHR", {
    durationMin: 390,
    airlines: ["British Airways"],
    bestPrograms: ["Avios", "Flying Blue", "Miles&Smiles"],
    seasonTip: {
      fr: "Novembre-avril (saison sèche) est le meilleur moment. Évitez les vacances de Noël pour les tarifs.",
      en: "November-April (dry season) is the best time. Avoid Christmas holidays for fares.",
    },
    milesToEconomy: 25000,
    milesToBusiness: 62500,
    isNonstop: true,
  }],

  ["JNB-LHR", {
    durationMin: 660,
    airlines: ["British Airways", "Virgin Atlantic"],
    bestPrograms: ["Avios", "Virgin Points", "Flying Blue"],
    seasonTip: {
      fr: "Mai-août (hiver austral, saison sèche) est idéal pour le tourisme. Les prix baissent hors vacances scolaires.",
      en: "May-August (austral winter, dry season) is ideal for tourism. Prices drop outside school holidays.",
    },
    milesToEconomy: 40000,
    milesToBusiness: 85000,
    isNonstop: true,
  }],

  ["CAI-CDG", {
    durationMin: 300,
    airlines: ["Air France", "EgyptAir"],
    bestPrograms: ["Flying Blue", "Miles&Smiles", "Avios"],
    seasonTip: {
      fr: "Octobre-avril est la meilleure période pour éviter la chaleur. Évitez Noël et Pâques pour les tarifs.",
      en: "October-April is the best period to avoid heat. Avoid Christmas and Easter for fares.",
    },
    milesToEconomy: 20000,
    milesToBusiness: 55000,
    isNonstop: true,
  }],

  ["ADD-DXB", {
    durationMin: 240,
    airlines: ["Ethiopian Airlines", "Emirates"],
    bestPrograms: ["Emirates Skywards", "Miles&Smiles", "Flying Blue"],
    seasonTip: {
      fr: "Octobre-janvier (saison sèche en Éthiopie) est le meilleur moment. Dubai est idéal en hiver (novembre-mars).",
      en: "October-January (dry season in Ethiopia) is best. Dubai is ideal in winter (November-March).",
    },
    milesToEconomy: 17500,
    milesToBusiness: 42500,
    isNonstop: true,
  }],

  ["DSS-IST", {
    durationMin: 420,
    airlines: ["Turkish Airlines"],
    bestPrograms: ["Miles&Smiles", "Flying Blue", "Avios"],
    seasonTip: {
      fr: "Avril-mai et septembre-octobre offrent les meilleurs tarifs et la météo idéale à Istanbul.",
      en: "April-May and September-October offer the best fares and ideal weather in Istanbul.",
    },
    milesToEconomy: 25000,
    milesToBusiness: 60000,
    isNonstop: true,
  }],

  ["ABJ-IST", {
    durationMin: 390,
    airlines: ["Turkish Airlines"],
    bestPrograms: ["Miles&Smiles", "Flying Blue", "Avios"],
    seasonTip: {
      fr: "Septembre-novembre et mars-avril sont les meilleures périodes pour profiter d'Istanbul sans la foule d'été.",
      en: "September-November and March-April are the best periods to enjoy Istanbul without summer crowds.",
    },
    milesToEconomy: 25000,
    milesToBusiness: 60000,
    isNonstop: true,
  }],

  ["CMN-JFK", {
    durationMin: 480,
    airlines: ["Royal Air Maroc"],
    bestPrograms: ["Safar", "Flying Blue", "Avios"],
    seasonTip: {
      fr: "Printemps (avril-juin) et automne (septembre-octobre) offrent le meilleur rapport qualité/prix sur cette route.",
      en: "Spring (April-June) and autumn (September-October) offer the best value on this route.",
    },
    milesToEconomy: 32000,
    milesToBusiness: 75000,
    isNonstop: true,
  }],

  ["LOS-ATL", {
    durationMin: 720,
    airlines: ["Delta"],
    bestPrograms: ["SkyMiles", "Flying Blue", "Miles&Smiles"],
    seasonTip: {
      fr: "Évitez l'été américain (juin-août) et les fêtes. Janvier-mars offre les meilleurs tarifs sur cette route.",
      en: "Avoid American summer (June-August) and holidays. January-March offers the best fares on this route.",
    },
    milesToEconomy: 35000,
    milesToBusiness: 70000,
    isNonstop: false,
    hub: "IST/CDG",
  }],

  ["NBO-DXB", {
    durationMin: 300,
    airlines: ["Emirates", "Kenya Airways"],
    bestPrograms: ["Emirates Skywards", "Flying Blue", "Miles&Smiles"],
    seasonTip: {
      fr: "Novembre-mars est idéal pour Dubai. Combinez avec la saison sèche du Kenya (juin-octobre) pour un safari.",
      en: "November-March is ideal for Dubai. Combine with Kenya's dry season (June-October) for a safari.",
    },
    milesToEconomy: 20000,
    milesToBusiness: 50000,
    isNonstop: true,
  }],

  // ── North America ↔ Europe ───────────────────────────────────────────────

  ["JFK-LHR", {
    durationMin: 420,
    airlines: ["British Airways", "Virgin Atlantic", "American Airlines"],
    bestPrograms: ["Avios", "Virgin Points", "AAdvantage"],
    seasonTip: {
      fr: "Évitez l'été (juin-août) et Noël. Janvier-mars et septembre-octobre offrent les meilleurs rapports miles/valeur.",
      en: "Avoid summer (June-August) and Christmas. January-March and September-October offer the best miles value.",
    },
    milesToEconomy: 26000,
    milesToBusiness: 50000,
    isNonstop: true,
  }],

  ["CDG-JFK", {
    durationMin: 480,
    airlines: ["Air France"],
    bestPrograms: ["Flying Blue", "Avios", "Virgin Points"],
    seasonTip: {
      fr: "Évitez juillet-août et les vacances scolaires françaises. Octobre-novembre et février-mars sont idéaux.",
      en: "Avoid July-August and French school holidays. October-November and February-March are ideal.",
    },
    milesToEconomy: 30000,
    milesToBusiness: 60000,
    isNonstop: true,
  }],

  ["LAX-CDG", {
    durationMin: 660,
    airlines: ["Air France"],
    bestPrograms: ["Flying Blue", "Avios", "Virgin Points"],
    seasonTip: {
      fr: "Voyagez au printemps (avril-mai) ou en automne (septembre-octobre) pour éviter la haute saison estivale.",
      en: "Travel in spring (April-May) or autumn (September-October) to avoid peak summer season.",
    },
    milesToEconomy: 35000,
    milesToBusiness: 75000,
    isNonstop: true,
  }],

  ["JFK-AMS", {
    durationMin: 450,
    airlines: ["KLM"],
    bestPrograms: ["Flying Blue", "Avios", "SkyMiles"],
    seasonTip: {
      fr: "Les tulipes sont en avril-mai mais les prix montent. Septembre-octobre est le meilleur compromis.",
      en: "Tulips bloom April-May but prices rise. September-October is the best compromise.",
    },
    milesToEconomy: 28000,
    milesToBusiness: 55000,
    isNonstop: true,
  }],

  ["ORD-LHR", {
    durationMin: 510,
    airlines: ["British Airways", "American Airlines", "United Airlines"],
    bestPrograms: ["Avios", "MileagePlus", "AAdvantage"],
    seasonTip: {
      fr: "Janvier-mars (hors vacances) et septembre-octobre offrent les meilleures valeurs en miles sur cette route.",
      en: "January-March (outside holidays) and September-October offer the best miles value on this route.",
    },
    milesToEconomy: 26000,
    milesToBusiness: 50000,
    isNonstop: true,
  }],

  ["BOS-LHR", {
    durationMin: 390,
    airlines: ["British Airways", "Virgin Atlantic", "American Airlines"],
    bestPrograms: ["Avios", "Virgin Points", "AAdvantage"],
    seasonTip: {
      fr: "Évitez l'été et les vacances de Thanksgiving. Mars-mai et septembre-octobre donnent les meilleurs tarifs.",
      en: "Avoid summer and Thanksgiving holidays. March-May and September-October give the best fares.",
    },
    milesToEconomy: 26000,
    milesToBusiness: 50000,
    isNonstop: true,
  }],

  ["MIA-MAD", {
    durationMin: 540,
    airlines: ["Iberia", "American Airlines"],
    bestPrograms: ["Avios", "AAdvantage", "Flying Blue"],
    seasonTip: {
      fr: "Évitez juillet-août (forte chaleur à Madrid, prix élevés). Avril-juin et septembre-octobre sont idéaux.",
      en: "Avoid July-August (intense heat in Madrid, high prices). April-June and September-October are ideal.",
    },
    milesToEconomy: 30000,
    milesToBusiness: 60000,
    isNonstop: true,
  }],

  // ── North America ↔ Asia ─────────────────────────────────────────────────

  ["JFK-NRT", {
    durationMin: 840,
    airlines: ["JAL", "ANA", "American Airlines"],
    bestPrograms: ["JAL Mileage Bank", "ANA Mileage Club", "AAdvantage"],
    seasonTip: {
      fr: "La saison des cerisiers (mars-avril) est magnifique mais très chargée. Octobre-novembre offre un bon équilibre.",
      en: "Cherry blossom season (March-April) is stunning but crowded. October-November offers a good balance.",
    },
    milesToEconomy: 35000,
    milesToBusiness: 80000,
    isNonstop: true,
  }],

  ["LAX-NRT", {
    durationMin: 720,
    airlines: ["JAL", "ANA", "United Airlines"],
    bestPrograms: ["JAL Mileage Bank", "ANA Mileage Club", "MileagePlus"],
    seasonTip: {
      fr: "Février-mars et octobre-novembre sont les meilleures périodes. Évitez les fêtes dorées japonaises.",
      en: "February-March and October-November are the best periods. Avoid Japanese Golden Week holidays.",
    },
    milesToEconomy: 35000,
    milesToBusiness: 80000,
    isNonstop: true,
  }],

  ["SFO-NRT", {
    durationMin: 660,
    airlines: ["ANA", "United Airlines"],
    bestPrograms: ["ANA Mileage Club", "MileagePlus", "JAL Mileage Bank"],
    seasonTip: {
      fr: "Octobre-novembre (feuillage automnal) et mars (cerisiers) sont très prisés. Voyagez en janvier-février pour économiser.",
      en: "October-November (autumn foliage) and March (cherry blossoms) are very popular. Travel in January-February to save.",
    },
    milesToEconomy: 35000,
    milesToBusiness: 80000,
    isNonstop: true,
  }],

  ["LAX-BKK", {
    durationMin: 1200,
    airlines: ["Thai Airways", "American Airlines"],
    bestPrograms: ["Royal Orchid Plus", "AAdvantage", "MileagePlus"],
    seasonTip: {
      fr: "Novembre-février (saison sèche) est la haute saison à Bangkok. Réservez tôt en miles pour économiser.",
      en: "November-February (dry season) is peak season in Bangkok. Book early with miles to save.",
    },
    milesToEconomy: 40000,
    milesToBusiness: 85000,
    isNonstop: false,
    hub: "NRT/HKG",
  }],

  ["LAX-SIN", {
    durationMin: 1080,
    airlines: ["Singapore Airlines"],
    bestPrograms: ["KrisFlyer", "MileagePlus", "AAdvantage"],
    seasonTip: {
      fr: "Singapour est agréable toute l'année. Évitez le Nouvel An chinois pour les tarifs. Février-avril est idéal.",
      en: "Singapore is pleasant year-round. Avoid Chinese New Year for fares. February-April is ideal.",
    },
    milesToEconomy: 38000,
    milesToBusiness: 80000,
    isNonstop: true,
  }],

  ["YYZ-LHR", {
    durationMin: 480,
    airlines: ["Air Canada", "British Airways"],
    bestPrograms: ["Aeroplan", "Avios", "Flying Blue"],
    seasonTip: {
      fr: "Évitez juillet-août et les vacances scolaires. Mars-mai et septembre-octobre sont les meilleures périodes.",
      en: "Avoid July-August and school holidays. March-May and September-October are the best periods.",
    },
    milesToEconomy: 30000,
    milesToBusiness: 60000,
    isNonstop: true,
  }],

  // ── Europe ↔ Asia ────────────────────────────────────────────────────────

  ["LHR-SIN", {
    durationMin: 780,
    airlines: ["Singapore Airlines", "British Airways"],
    bestPrograms: ["KrisFlyer", "Avios", "Flying Blue"],
    seasonTip: {
      fr: "Singapour est ensoleillée toute l'année. Évitez la période du Nouvel An chinois (jan-fév) pour de meilleurs tarifs.",
      en: "Singapore is sunny year-round. Avoid Chinese New Year period (Jan-Feb) for better fares.",
    },
    milesToEconomy: 37500,
    milesToBusiness: 67500,
    isNonstop: true,
  }],

  ["CDG-NRT", {
    durationMin: 750,
    airlines: ["Air France", "JAL"],
    bestPrograms: ["Flying Blue", "JAL Mileage Bank", "ANA Mileage Club"],
    seasonTip: {
      fr: "La saison des cerisiers (fin mars-début avril) est très prisée. Octobre-novembre offre des couleurs d'automne et moins de foule.",
      en: "Cherry blossom season (late March-early April) is very popular. October-November offers autumn colours and fewer crowds.",
    },
    milesToEconomy: 40000,
    milesToBusiness: 85000,
    isNonstop: true,
  }],

  ["LHR-DXB", {
    durationMin: 420,
    airlines: ["Emirates", "British Airways", "Virgin Atlantic"],
    bestPrograms: ["Emirates Skywards", "Avios", "Virgin Points"],
    seasonTip: {
      fr: "Octobre-avril est la haute saison à Dubai (temps agréable). Évitez l'été (40°C+). Les miles offrent la meilleure valeur en première classe Emirates.",
      en: "October-April is peak season in Dubai (pleasant weather). Avoid summer (40°C+). Miles offer the best value for Emirates First Class.",
    },
    milesToEconomy: 25000,
    milesToBusiness: 55000,
    isNonstop: true,
  }],

  ["LHR-BKK", {
    durationMin: 690,
    airlines: ["Thai Airways", "British Airways"],
    bestPrograms: ["Avios", "Royal Orchid Plus", "Flying Blue"],
    seasonTip: {
      fr: "Novembre-mars (saison fraîche et sèche) est idéal pour Bangkok. Évitez la mousson (juin-octobre).",
      en: "November-March (cool and dry season) is ideal for Bangkok. Avoid the monsoon (June-October).",
    },
    milesToEconomy: 35000,
    milesToBusiness: 75000,
    isNonstop: true,
  }],

  ["CDG-BKK", {
    durationMin: 660,
    airlines: ["Air France", "Thai Airways"],
    bestPrograms: ["Flying Blue", "Royal Orchid Plus", "Miles&Smiles"],
    seasonTip: {
      fr: "Novembre-février est la meilleure période. Évitez juillet-août (mousson et forte demande européenne).",
      en: "November-February is the best period. Avoid July-August (monsoon and high European demand).",
    },
    milesToEconomy: 35000,
    milesToBusiness: 75000,
    isNonstop: true,
  }],

  ["FRA-SIN", {
    durationMin: 750,
    airlines: ["Lufthansa", "Singapore Airlines"],
    bestPrograms: ["Miles&More", "KrisFlyer", "Avios"],
    seasonTip: {
      fr: "Singapour est idéale toute l'année. Voyagez en février ou septembre pour les meilleurs tarifs au départ de Francfort.",
      en: "Singapore is ideal year-round. Travel in February or September for the best fares from Frankfurt.",
    },
    milesToEconomy: 37500,
    milesToBusiness: 65000,
    isNonstop: true,
  }],

  ["LHR-HKG", {
    durationMin: 720,
    airlines: ["Cathay Pacific", "British Airways"],
    bestPrograms: ["Asia Miles", "Avios", "KrisFlyer"],
    seasonTip: {
      fr: "Octobre-décembre (automne à Hong Kong, temps agréable) est la meilleure période. Évitez le Nouvel An chinois.",
      en: "October-December (Hong Kong autumn, pleasant weather) is the best period. Avoid Chinese New Year.",
    },
    milesToEconomy: 35000,
    milesToBusiness: 70000,
    isNonstop: true,
  }],

  // ── Middle East Hub Routes ───────────────────────────────────────────────

  ["DXB-LHR", {
    durationMin: 420,
    airlines: ["Emirates"],
    bestPrograms: ["Emirates Skywards", "Avios", "Virgin Points"],
    seasonTip: {
      fr: "Voyagez depuis Dubai en octobre-avril (hiver doux). Les miles Emirates Skywards offrent une valeur exceptionnelle en Business.",
      en: "Travel from Dubai October-April (mild winter). Emirates Skywards miles offer exceptional value in Business.",
    },
    milesToEconomy: 25000,
    milesToBusiness: 55000,
    isNonstop: true,
  }],

  ["DXB-JFK", {
    durationMin: 810,
    airlines: ["Emirates"],
    bestPrograms: ["Emirates Skywards", "AAdvantage", "MileagePlus"],
    seasonTip: {
      fr: "Partez de Dubai en hiver (oct-mars). Pour New York, les printemps et automnes offrent les meilleures conditions.",
      en: "Depart Dubai in winter (Oct-Mar). For New York, spring and autumn offer the best conditions.",
    },
    milesToEconomy: 40000,
    milesToBusiness: 80000,
    isNonstop: true,
  }],

  ["DOH-LHR", {
    durationMin: 405,
    airlines: ["Qatar Airways"],
    bestPrograms: ["Privilege Club", "Avios", "Flying Blue"],
    seasonTip: {
      fr: "Qatar Airways offre régulièrement des promotions de miles. Voyagez en janvier-mars pour les meilleurs tarifs.",
      en: "Qatar Airways regularly offers miles promotions. Travel in January-March for the best fares.",
    },
    milesToEconomy: 25000,
    milesToBusiness: 55000,
    isNonstop: true,
  }],

  ["DOH-JFK", {
    durationMin: 810,
    airlines: ["Qatar Airways"],
    bestPrograms: ["Privilege Club", "AAdvantage", "Flying Blue"],
    seasonTip: {
      fr: "Évitez l'été américain. Mars-mai et octobre-novembre offrent les meilleures valeurs en miles sur cette route.",
      en: "Avoid American summer. March-May and October-November offer the best miles value on this route.",
    },
    milesToEconomy: 40000,
    milesToBusiness: 80000,
    isNonstop: true,
  }],

  ["IST-JFK", {
    durationMin: 630,
    airlines: ["Turkish Airlines"],
    bestPrograms: ["Miles&Smiles", "AAdvantage", "Flying Blue"],
    seasonTip: {
      fr: "Profitez d'Istanbul au printemps ou en automne lors de l'escale. Évitez l'été touristique pour économiser en miles.",
      en: "Enjoy Istanbul in spring or autumn during layovers. Avoid peak tourist summer to save on miles.",
    },
    milesToEconomy: 35000,
    milesToBusiness: 70000,
    isNonstop: true,
  }],

  // ── Asia-Pacific ─────────────────────────────────────────────────────────

  ["SIN-SYD", {
    durationMin: 480,
    airlines: ["Singapore Airlines", "Qantas"],
    bestPrograms: ["KrisFlyer", "Qantas Points", "Asia Miles"],
    seasonTip: {
      fr: "Sydney est idéale en été austral (décembre-février). Réservez en miles tôt pour la période de Noël.",
      en: "Sydney is ideal in austral summer (December-February). Book miles early for the Christmas period.",
    },
    milesToEconomy: 30000,
    milesToBusiness: 60000,
    isNonstop: true,
  }],

  ["SIN-NRT", {
    durationMin: 420,
    airlines: ["Singapore Airlines", "JAL"],
    bestPrograms: ["KrisFlyer", "JAL Mileage Bank", "Asia Miles"],
    seasonTip: {
      fr: "Évitez la Golden Week japonaise (fin avril-début mai). Octobre-novembre est parfait pour la météo et les tarifs.",
      en: "Avoid Japanese Golden Week (late April-early May). October-November is perfect for weather and fares.",
    },
    milesToEconomy: 25000,
    milesToBusiness: 55000,
    isNonstop: true,
  }],

  ["HKG-LHR", {
    durationMin: 750,
    airlines: ["Cathay Pacific"],
    bestPrograms: ["Asia Miles", "Avios", "KrisFlyer"],
    seasonTip: {
      fr: "Voyagez depuis Hong Kong en octobre-décembre. Arrivez à Londres au printemps (avril-mai) pour la météo idéale.",
      en: "Travel from Hong Kong in October-December. Arrive in London in spring (April-May) for ideal weather.",
    },
    milesToEconomy: 35000,
    milesToBusiness: 70000,
    isNonstop: true,
  }],

  ["SYD-LHR", {
    durationMin: 1260,
    airlines: ["Qantas", "British Airways"],
    bestPrograms: ["Qantas Points", "Avios", "Flying Blue"],
    seasonTip: {
      fr: "L'été australien (jan-mars) est idéal à Sydney. Arrivez à Londres au printemps pour deux étés consécutifs !",
      en: "Australian summer (Jan-Mar) is ideal in Sydney. Arrive in London in spring for two consecutive summers!",
    },
    milesToEconomy: 40000,
    milesToBusiness: 80000,
    isNonstop: false,
    hub: "SIN/DXB",
  }],

  // ── Latin America ────────────────────────────────────────────────────────

  ["MIA-BOG", {
    durationMin: 240,
    airlines: ["Avianca", "American Airlines"],
    bestPrograms: ["LifeMiles", "AAdvantage", "Flying Blue"],
    seasonTip: {
      fr: "Bogotá a une météo clémente toute l'année (printemps éternel). Décembre-janvier et juin-juillet sont les hautes saisons.",
      en: "Bogota has pleasant weather year-round (eternal spring). December-January and June-July are peak seasons.",
    },
    milesToEconomy: 15000,
    milesToBusiness: 40000,
    isNonstop: true,
  }],

  ["GRU-LHR", {
    durationMin: 690,
    airlines: ["LATAM", "British Airways"],
    bestPrograms: ["LATAM Pass", "Avios", "Flying Blue"],
    seasonTip: {
      fr: "Évitez le Carnaval de Rio (fév-mars) et Noël. Avril-juin et août-octobre offrent les meilleurs tarifs en miles.",
      en: "Avoid Rio Carnival (Feb-Mar) and Christmas. April-June and August-October offer the best miles fares.",
    },
    milesToEconomy: 40000,
    milesToBusiness: 80000,
    isNonstop: true,
  }],

  ["GRU-CDG", {
    durationMin: 660,
    airlines: ["Air France", "LATAM"],
    bestPrograms: ["Flying Blue", "LATAM Pass", "Avios"],
    seasonTip: {
      fr: "Voyagez en mai-juin ou août-septembre pour les meilleurs tarifs. Évitez le Carnaval et les vacances scolaires françaises.",
      en: "Travel in May-June or August-September for the best fares. Avoid Carnival and French school holidays.",
    },
    milesToEconomy: 40000,
    milesToBusiness: 80000,
    isNonstop: true,
  }],

  ["EZE-MAD", {
    durationMin: 780,
    airlines: ["Iberia", "Aerolíneas Argentinas"],
    bestPrograms: ["Avios", "AAdvantage", "Flying Blue"],
    seasonTip: {
      fr: "L'été argentin (déc-fév) est la haute saison. Voyagez en mars-mai ou septembre pour les meilleurs tarifs en miles.",
      en: "Argentine summer (Dec-Feb) is peak season. Travel in March-May or September for the best miles fares.",
    },
    milesToEconomy: 40000,
    milesToBusiness: 80000,
    isNonstop: true,
  }],

  ["SCL-MIA", {
    durationMin: 540,
    airlines: ["LATAM", "American Airlines"],
    bestPrograms: ["LifeMiles", "LATAM Pass", "AAdvantage"],
    seasonTip: {
      fr: "L'été chilien (déc-fév) et Pâques sont en haute saison. Mars-mai et août-octobre offrent les meilleurs tarifs.",
      en: "Chilean summer (Dec-Feb) and Easter are peak season. March-May and August-October offer the best fares.",
    },
    milesToEconomy: 30000,
    milesToBusiness: 65000,
    isNonstop: true,
  }],

  ["BOG-MAD", {
    durationMin: 600,
    airlines: ["Avianca", "Iberia"],
    bestPrograms: ["LifeMiles", "Avios", "AAdvantage"],
    seasonTip: {
      fr: "Profitez des promotions LifeMiles régulières sur cette route. Voyagez en avril-mai ou septembre-octobre pour les meilleurs tarifs.",
      en: "Take advantage of regular LifeMiles promotions on this route. Travel in April-May or September-October for the best fares.",
    },
    milesToEconomy: 32000,
    milesToBusiness: 68000,
    isNonstop: true,
  }],

]);

// ─── Helper ──────────────────────────────────────────────────────────────────

/**
 * Look up route metadata by airport codes (bidirectional).
 * e.g. getRouteMeta("DSS", "CDG") === getRouteMeta("CDG", "DSS")
 */
export function getRouteMeta(from: string, to: string): RouteMeta | undefined {
  return ROUTE_META.get(`${from}-${to}`) ?? ROUTE_META.get(`${to}-${from}`);
}
