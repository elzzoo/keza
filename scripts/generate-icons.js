// Generate simple PWA icons using canvas (Node 18+)
// Run: node scripts/generate-icons.js

const { createCanvas } = (() => {
  try { return require("canvas"); } catch { return { createCanvas: null }; }
})();

const fs = require("fs");
const path = require("path");

function generateSVGIcon(size) {
  const fontSize = Math.round(size * 0.28);
  const subFontSize = Math.round(size * 0.22);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1e3a5f"/>
      <stop offset="100%" style="stop-color:#0a0a1a"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.2)}" fill="url(#bg)"/>
  <text x="${size/2}" y="${size * 0.46}" text-anchor="middle" font-family="system-ui,-apple-system,sans-serif" font-weight="900" font-size="${fontSize}" fill="#3b82f6">KE</text>
  <text x="${size/2}" y="${size * 0.72}" text-anchor="middle" font-family="system-ui,-apple-system,sans-serif" font-weight="900" font-size="${subFontSize}" fill="#e2e8f0">ZA</text>
</svg>`;
}

const iconsDir = path.join(__dirname, "..", "public", "icons");
fs.mkdirSync(iconsDir, { recursive: true });

// Write SVG versions that will be served
for (const size of [192, 512]) {
  const svg = generateSVGIcon(size);
  const svgPath = path.join(iconsDir, `icon-${size}.svg`);
  fs.writeFileSync(svgPath, svg);
  console.log(`Created ${svgPath}`);
}

console.log("\nNote: For production, convert SVGs to PNGs using:");
console.log("  npx sharp-cli -i public/icons/icon-192.svg -o public/icons/icon-192.png");
console.log("  npx sharp-cli -i public/icons/icon-512.svg -o public/icons/icon-512.png");
console.log("\nOr use any SVG→PNG tool. For now, update manifest.json to use .svg");
