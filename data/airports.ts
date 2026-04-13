export interface Airport {
  code: string;
  city: string;
  cityEn: string;
  country: string;
  countryEn: string;
  flag: string;
  iso2: string;
  lat: number;
  lon: number;
}

export const AIRPORTS: Airport[] = [
  {code:"DSS",city:"Dakar",cityEn:"Dakar",country:"Sénégal",countryEn:"Senegal",flag:"🇸🇳",iso2:"SN",lat:14.67,lon:-17.07},
  {code:"ABJ",city:"Abidjan",cityEn:"Abidjan",country:"Côte d'Ivoire",countryEn:"Ivory Coast",flag:"🇨🇮",iso2:"CI",lat:5.26,lon:-3.93},
  {code:"ACC",city:"Accra",cityEn:"Accra",country:"Ghana",countryEn:"Ghana",flag:"🇬🇭",iso2:"GH",lat:5.61,lon:-0.17},
  {code:"BKO",city:"Bamako",cityEn:"Bamako",country:"Mali",countryEn:"Mali",flag:"🇲🇱",iso2:"ML",lat:12.54,lon:-7.95},
  {code:"LOS",city:"Lagos",cityEn:"Lagos",country:"Nigeria",countryEn:"Nigeria",flag:"🇳🇬",iso2:"NG",lat:6.58,lon:3.32},
  {code:"ABV",city:"Abuja",cityEn:"Abuja",country:"Nigeria",countryEn:"Nigeria",flag:"🇳🇬",iso2:"NG",lat:9.00,lon:7.26},
  {code:"OUA",city:"Ouagadougou",cityEn:"Ouagadougou",country:"Burkina Faso",countryEn:"Burkina Faso",flag:"🇧🇫",iso2:"BF",lat:12.35,lon:-1.51},
  {code:"COO",city:"Cotonou",cityEn:"Cotonou",country:"Bénin",countryEn:"Benin",flag:"🇧🇯",iso2:"BJ",lat:6.36,lon:2.38},
  {code:"CKY",city:"Conakry",cityEn:"Conakry",country:"Guinée",countryEn:"Guinea",flag:"🇬🇳",iso2:"GN",lat:9.58,lon:-13.61},
  {code:"DLA",city:"Douala",cityEn:"Douala",country:"Cameroun",countryEn:"Cameroon",flag:"🇨🇲",iso2:"CM",lat:4.01,lon:9.72},
  {code:"LBV",city:"Libreville",cityEn:"Libreville",country:"Gabon",countryEn:"Gabon",flag:"🇬🇦",iso2:"GA",lat:0.46,lon:9.41},
  {code:"ADD",city:"Addis Abeba",cityEn:"Addis Ababa",country:"Éthiopie",countryEn:"Ethiopia",flag:"🇪🇹",iso2:"ET",lat:8.98,lon:38.80},
  {code:"NBO",city:"Nairobi",cityEn:"Nairobi",country:"Kenya",countryEn:"Kenya",flag:"🇰🇪",iso2:"KE",lat:-1.32,lon:36.93},
  {code:"JNB",city:"Johannesburg",cityEn:"Johannesburg",country:"Afrique du Sud",countryEn:"South Africa",flag:"🇿🇦",iso2:"ZA",lat:-26.14,lon:28.24},
  {code:"CPT",city:"Le Cap",cityEn:"Cape Town",country:"Afrique du Sud",countryEn:"South Africa",flag:"🇿🇦",iso2:"ZA",lat:-33.96,lon:18.60},
  {code:"CAI",city:"Le Caire",cityEn:"Cairo",country:"Égypte",countryEn:"Egypt",flag:"🇪🇬",iso2:"EG",lat:30.12,lon:31.41},
  {code:"CMN",city:"Casablanca",cityEn:"Casablanca",country:"Maroc",countryEn:"Morocco",flag:"🇲🇦",iso2:"MA",lat:33.37,lon:-7.59},
  {code:"TUN",city:"Tunis",cityEn:"Tunis",country:"Tunisie",countryEn:"Tunisia",flag:"🇹🇳",iso2:"TN",lat:36.85,lon:10.23},
  {code:"ALG",city:"Alger",cityEn:"Algiers",country:"Algérie",countryEn:"Algeria",flag:"🇩🇿",iso2:"DZ",lat:36.69,lon:3.22},
  {code:"LHR",city:"Londres",cityEn:"London",country:"Royaume-Uni",countryEn:"United Kingdom",flag:"🇬🇧",iso2:"GB",lat:51.48,lon:-0.45},
  {code:"LGW",city:"Londres Gatwick",cityEn:"London Gatwick",country:"Royaume-Uni",countryEn:"United Kingdom",flag:"🇬🇧",iso2:"GB",lat:51.15,lon:-0.18},
  {code:"CDG",city:"Paris CDG",cityEn:"Paris CDG",country:"France",countryEn:"France",flag:"🇫🇷",iso2:"FR",lat:49.01,lon:2.55},
  {code:"ORY",city:"Paris Orly",cityEn:"Paris Orly",country:"France",countryEn:"France",flag:"🇫🇷",iso2:"FR",lat:48.73,lon:2.38},
  {code:"AMS",city:"Amsterdam",cityEn:"Amsterdam",country:"Pays-Bas",countryEn:"Netherlands",flag:"🇳🇱",iso2:"NL",lat:52.31,lon:4.77},
  {code:"BRU",city:"Bruxelles",cityEn:"Brussels",country:"Belgique",countryEn:"Belgium",flag:"🇧🇪",iso2:"BE",lat:50.90,lon:4.48},
  {code:"FRA",city:"Francfort",cityEn:"Frankfurt",country:"Allemagne",countryEn:"Germany",flag:"🇩🇪",iso2:"DE",lat:50.03,lon:8.57},
  {code:"MUC",city:"Munich",cityEn:"Munich",country:"Allemagne",countryEn:"Germany",flag:"🇩🇪",iso2:"DE",lat:48.35,lon:11.79},
  {code:"MAD",city:"Madrid",cityEn:"Madrid",country:"Espagne",countryEn:"Spain",flag:"🇪🇸",iso2:"ES",lat:40.47,lon:-3.57},
  {code:"BCN",city:"Barcelone",cityEn:"Barcelona",country:"Espagne",countryEn:"Spain",flag:"🇪🇸",iso2:"ES",lat:41.30,lon:2.08},
  {code:"LIS",city:"Lisbonne",cityEn:"Lisbon",country:"Portugal",countryEn:"Portugal",flag:"🇵🇹",iso2:"PT",lat:38.77,lon:-9.13},
  {code:"FCO",city:"Rome",cityEn:"Rome",country:"Italie",countryEn:"Italy",flag:"🇮🇹",iso2:"IT",lat:41.80,lon:12.25},
  {code:"MXP",city:"Milan",cityEn:"Milan",country:"Italie",countryEn:"Italy",flag:"🇮🇹",iso2:"IT",lat:45.63,lon:8.72},
  {code:"ZRH",city:"Zurich",cityEn:"Zurich",country:"Suisse",countryEn:"Switzerland",flag:"🇨🇭",iso2:"CH",lat:47.46,lon:8.55},
  {code:"GVA",city:"Genève",cityEn:"Geneva",country:"Suisse",countryEn:"Switzerland",flag:"🇨🇭",iso2:"CH",lat:46.24,lon:6.11},
  {code:"IST",city:"Istanbul",cityEn:"Istanbul",country:"Turquie",countryEn:"Turkey",flag:"🇹🇷",iso2:"TR",lat:41.27,lon:28.74},
  {code:"DXB",city:"Dubaï",cityEn:"Dubai",country:"Émirats",countryEn:"UAE",flag:"🇦🇪",iso2:"AE",lat:25.25,lon:55.37},
  {code:"AUH",city:"Abu Dhabi",cityEn:"Abu Dhabi",country:"Émirats",countryEn:"UAE",flag:"🇦🇪",iso2:"AE",lat:24.44,lon:54.65},
  {code:"DOH",city:"Doha",cityEn:"Doha",country:"Qatar",countryEn:"Qatar",flag:"🇶🇦",iso2:"QA",lat:25.27,lon:51.61},
  {code:"RUH",city:"Riyad",cityEn:"Riyadh",country:"Arabie Saoudite",countryEn:"Saudi Arabia",flag:"🇸🇦",iso2:"SA",lat:24.96,lon:46.70},
  {code:"JED",city:"Djeddah",cityEn:"Jeddah",country:"Arabie Saoudite",countryEn:"Saudi Arabia",flag:"🇸🇦",iso2:"SA",lat:21.67,lon:39.16},
  {code:"BEY",city:"Beyrouth",cityEn:"Beirut",country:"Liban",countryEn:"Lebanon",flag:"🇱🇧",iso2:"LB",lat:33.82,lon:35.49},
  {code:"TLV",city:"Tel Aviv",cityEn:"Tel Aviv",country:"Israël",countryEn:"Israel",flag:"🇮🇱",iso2:"IL",lat:32.01,lon:34.89},
  {code:"DEL",city:"Delhi",cityEn:"Delhi",country:"Inde",countryEn:"India",flag:"🇮🇳",iso2:"IN",lat:28.56,lon:77.10},
  {code:"BOM",city:"Mumbai",cityEn:"Mumbai",country:"Inde",countryEn:"India",flag:"🇮🇳",iso2:"IN",lat:19.09,lon:72.87},
  {code:"BKK",city:"Bangkok",cityEn:"Bangkok",country:"Thaïlande",countryEn:"Thailand",flag:"🇹🇭",iso2:"TH",lat:13.69,lon:100.75},
  {code:"SIN",city:"Singapour",cityEn:"Singapore",country:"Singapour",countryEn:"Singapore",flag:"🇸🇬",iso2:"SG",lat:1.36,lon:103.99},
  {code:"HKG",city:"Hong Kong",cityEn:"Hong Kong",country:"Hong Kong",countryEn:"Hong Kong",flag:"🇭🇰",iso2:"HK",lat:22.31,lon:113.91},
  {code:"PEK",city:"Pékin",cityEn:"Beijing",country:"Chine",countryEn:"China",flag:"🇨🇳",iso2:"CN",lat:40.08,lon:116.58},
  {code:"PVG",city:"Shanghai",cityEn:"Shanghai",country:"Chine",countryEn:"China",flag:"🇨🇳",iso2:"CN",lat:31.15,lon:121.80},
  {code:"NRT",city:"Tokyo Narita",cityEn:"Tokyo Narita",country:"Japon",countryEn:"Japan",flag:"🇯🇵",iso2:"JP",lat:35.76,lon:140.39},
  {code:"ICN",city:"Séoul",cityEn:"Seoul",country:"Corée du Sud",countryEn:"South Korea",flag:"🇰🇷",iso2:"KR",lat:37.46,lon:126.44},
  {code:"JFK",city:"New York JFK",cityEn:"New York JFK",country:"États-Unis",countryEn:"United States",flag:"🇺🇸",iso2:"US",lat:40.64,lon:-73.78},
  {code:"EWR",city:"New York Newark",cityEn:"New York Newark",country:"États-Unis",countryEn:"United States",flag:"🇺🇸",iso2:"US",lat:40.69,lon:-74.17},
  {code:"LAX",city:"Los Angeles",cityEn:"Los Angeles",country:"États-Unis",countryEn:"United States",flag:"🇺🇸",iso2:"US",lat:33.94,lon:-118.41},
  {code:"ORD",city:"Chicago",cityEn:"Chicago",country:"États-Unis",countryEn:"United States",flag:"🇺🇸",iso2:"US",lat:41.98,lon:-87.90},
  {code:"MIA",city:"Miami",cityEn:"Miami",country:"États-Unis",countryEn:"United States",flag:"🇺🇸",iso2:"US",lat:25.79,lon:-80.29},
  {code:"ATL",city:"Atlanta",cityEn:"Atlanta",country:"États-Unis",countryEn:"United States",flag:"🇺🇸",iso2:"US",lat:33.64,lon:-84.43},
  {code:"SFO",city:"San Francisco",cityEn:"San Francisco",country:"États-Unis",countryEn:"United States",flag:"🇺🇸",iso2:"US",lat:37.62,lon:-122.38},
  {code:"BOS",city:"Boston",cityEn:"Boston",country:"États-Unis",countryEn:"United States",flag:"🇺🇸",iso2:"US",lat:42.37,lon:-71.01},
  {code:"DFW",city:"Dallas",cityEn:"Dallas",country:"États-Unis",countryEn:"United States",flag:"🇺🇸",iso2:"US",lat:32.90,lon:-97.04},
  {code:"IAD",city:"Washington DC",cityEn:"Washington DC",country:"États-Unis",countryEn:"United States",flag:"🇺🇸",iso2:"US",lat:38.94,lon:-77.46},
  {code:"YYZ",city:"Toronto",cityEn:"Toronto",country:"Canada",countryEn:"Canada",flag:"🇨🇦",iso2:"CA",lat:43.68,lon:-79.63},
  {code:"YUL",city:"Montréal",cityEn:"Montreal",country:"Canada",countryEn:"Canada",flag:"🇨🇦",iso2:"CA",lat:45.47,lon:-73.74},
  {code:"GRU",city:"São Paulo",cityEn:"São Paulo",country:"Brésil",countryEn:"Brazil",flag:"🇧🇷",iso2:"BR",lat:-23.43,lon:-46.47},
  {code:"GIG",city:"Rio de Janeiro",cityEn:"Rio de Janeiro",country:"Brésil",countryEn:"Brazil",flag:"🇧🇷",iso2:"BR",lat:-22.81,lon:-43.25},
  {code:"EZE",city:"Buenos Aires",cityEn:"Buenos Aires",country:"Argentine",countryEn:"Argentina",flag:"🇦🇷",iso2:"AR",lat:-34.82,lon:-58.54},
  {code:"BOG",city:"Bogotá",cityEn:"Bogotá",country:"Colombie",countryEn:"Colombia",flag:"🇨🇴",iso2:"CO",lat:4.70,lon:-74.14},
  {code:"LIM",city:"Lima",cityEn:"Lima",country:"Pérou",countryEn:"Peru",flag:"🇵🇪",iso2:"PE",lat:-12.02,lon:-77.11},
  {code:"MEX",city:"Mexico",cityEn:"Mexico City",country:"Mexique",countryEn:"Mexico",flag:"🇲🇽",iso2:"MX",lat:19.44,lon:-99.07},
  {code:"SYD",city:"Sydney",cityEn:"Sydney",country:"Australie",countryEn:"Australia",flag:"🇦🇺",iso2:"AU",lat:-33.95,lon:151.18},
  {code:"MEL",city:"Melbourne",cityEn:"Melbourne",country:"Australie",countryEn:"Australia",flag:"🇦🇺",iso2:"AU",lat:-37.67,lon:144.84},
  {code:"AKL",city:"Auckland",cityEn:"Auckland",country:"Nouvelle-Zélande",countryEn:"New Zealand",flag:"🇳🇿",iso2:"NZ",lat:-37.01,lon:174.79},
];

export const REGION = {
  DSS:"africa",ABJ:"africa",ACC:"africa",BKO:"africa",LOS:"africa",ABV:"africa",OUA:"africa",COO:"africa",CKY:"africa",DLA:"africa",LBV:"africa",ADD:"africa",NBO:"africa",JNB:"africa",CPT:"africa",CAI:"africa",CMN:"africa",TUN:"africa",ALG:"africa",
  LHR:"europe",LGW:"europe",CDG:"europe",ORY:"europe",AMS:"europe",BRU:"europe",FRA:"europe",MUC:"europe",MAD:"europe",BCN:"europe",LIS:"europe",FCO:"europe",MXP:"europe",ZRH:"europe",GVA:"europe",IST:"europe",
  DXB:"middle-east",AUH:"middle-east",DOH:"middle-east",RUH:"middle-east",JED:"middle-east",BEY:"middle-east",TLV:"middle-east",
  DEL:"asia",BOM:"asia",BKK:"asia",SIN:"asia",HKG:"asia",PEK:"asia",PVG:"asia",NRT:"asia",ICN:"asia",
  JFK:"americas",EWR:"americas",LAX:"americas",ORD:"americas",MIA:"americas",ATL:"americas",SFO:"americas",BOS:"americas",DFW:"americas",IAD:"americas",YYZ:"americas",YUL:"americas",GRU:"americas",GIG:"americas",EZE:"americas",BOG:"americas",LIM:"americas",MEX:"americas",
  SYD:"oceania",MEL:"oceania",AKL:"oceania",
};

export const airportsMap = Object.fromEntries(AIRPORTS.map(a => [a.code, a]));
