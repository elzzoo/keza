/**
 * __tests__/data/consistency.test.ts
 *
 * Cross-file consistency checks — prevents silent data drift between the
 * engine's data files.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * The engine uses five inter-dependent data files that must stay in sync:
 *
 *   milesPrices.ts          ← canonical market values (source of truth)
 *   globalPrograms.ts        ← must reflect milesPrices, must list all real transfer partners
 *   milesAcquisition.ts      ← must reflect milesPrices, must list the same transfer partners
 *   transferBonuses.ts       ← canonical transfer graph (cost engine)
 *   transfers.ts             ← optimizer transfer graph (must be a subset of transferBonuses)
 *
 * Without these tests, edits to one file silently diverge from the others.
 * Every test here corresponds to a category of bug found during audits 11–26.
 *
 * NAMING CONVENTIONS
 * ------------------
 * transferBonuses.ts and transfers.ts use SHORT names for bank currencies:
 *   "Amex MR", "Chase UR"
 * globalPrograms.ts and milesAcquisition.ts use LONG names:
 *   "Amex Membership Rewards", "Chase Ultimate Rewards"
 * The BANK_NAME_MAP below bridges the two.
 */

import { TRANSFER_BONUSES } from "@/data/transferBonuses";
import { TRANSFERS }         from "@/lib/transfers";
import { GLOBAL_PROGRAMS }   from "@/lib/globalPrograms";
import { MILES_PRICE_MAP }   from "@/data/milesPrices";
import {
  ACQUISITION_PROGRAM_DATA,
  supportedPrograms,
} from "@/lib/milesAcquisition";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Maps the SHORT bank-currency names used in transferBonuses.ts / transfers.ts
 * to the LONG names used in globalPrograms.ts / milesAcquisition.ts.
 */
const BANK_NAME_MAP: Record<string, string> = {
  "Amex MR":          "Amex Membership Rewards",
  "Chase UR":         "Chase Ultimate Rewards",
  "Citi ThankYou":    "Citi ThankYou",
  "Capital One Miles":"Capital One Miles",
  "Bilt Rewards":     "Bilt Rewards",
  "Brex Rewards":     "Brex Rewards",
  "Marriott Bonvoy":  "Marriott Bonvoy",
  "Wells Fargo":      "Wells Fargo Rewards",
};

/** Normalize a short name to its long form (or keep as-is if already long). */
function longName(short: string): string {
  return BANK_NAME_MAP[short] ?? short;
}

const GP_BY_NAME = new Map(GLOBAL_PROGRAMS.map(p => [p.name, p]));

// ---------------------------------------------------------------------------
// 1. transfers.ts (optimizer) ⊆ transferBonuses.ts (cost engine)
// ---------------------------------------------------------------------------

describe("transfers.ts ↔ transferBonuses.ts", () => {
  it("every entry in transfers.ts exists in transferBonuses.ts", () => {
    // The optimizer list must be covered by the cost engine.
    // transferBonuses.ts is allowed to have extra entries (e.g. Marriott Bonvoy)
    // that are not in the optimizer — that is intentional.
    const bonusKeys = new Set(
      TRANSFER_BONUSES.map(b => `${b.from}::${b.to}`)
    );

    const missing = TRANSFERS
      .filter(t => !bonusKeys.has(`${t.from}::${t.to}`))
      .map(t => `${t.from} → ${t.to}`);

    expect(missing).toEqual(
      // Fail message lists every missing pair so it's easy to fix.
      expect.arrayContaining([])
    );

    if (missing.length > 0) {
      throw new Error(
        `transfers.ts has ${missing.length} entries not in transferBonuses.ts:\n` +
        missing.map(m => `  • ${m}`).join("\n") +
        "\n\nAdd these to data/transferBonuses.ts."
      );
    }
  });
});

// ---------------------------------------------------------------------------
// 2. transferBonuses.ts destination programs exist in globalPrograms.ts
// ---------------------------------------------------------------------------

describe("transferBonuses.ts → globalPrograms.ts program existence", () => {
  it("every destination program in transferBonuses.ts is a known program", () => {
    const programNames = new Set(GLOBAL_PROGRAMS.map(p => p.name));

    const seen = new Set<string>();
    const unknown: string[] = [];
    for (const b of TRANSFER_BONUSES) {
      if (!programNames.has(b.to) && !seen.has(b.to)) {
        seen.add(b.to);
        unknown.push(b.to);
      }
    }

    if (unknown.length > 0) {
      throw new Error(
        `transferBonuses.ts references ${unknown.length} unknown programs:\n` +
        unknown.map(p => `  • "${p}"`).join("\n") +
        "\n\nEither add the program to lib/globalPrograms.ts or fix the name."
      );
    }
  });
});

// ---------------------------------------------------------------------------
// 3. transferBonuses.ts ↔ globalPrograms.ts transferPartnersFrom
// ---------------------------------------------------------------------------

describe("transferBonuses.ts ↔ globalPrograms.ts transferPartnersFrom", () => {
  it("every transfer in transferBonuses.ts appears in the destination program's transferPartnersFrom", () => {
    const missing: string[] = [];

    for (const bonus of TRANSFER_BONUSES) {
      const prog = GP_BY_NAME.get(bonus.to);
      if (!prog) continue; // already caught by test 2

      const longFrom = longName(bonus.from);
      if (!prog.transferPartnersFrom.includes(longFrom)) {
        missing.push(`globalPrograms["${bonus.to}"].transferPartnersFrom missing "${longFrom}" (from transferBonuses "${bonus.from}")`);
      }
    }

    if (missing.length > 0) {
      throw new Error(
        `${missing.length} transfer partner(s) in transferBonuses.ts not reflected in globalPrograms.ts:\n` +
        missing.map(m => `  • ${m}`).join("\n") +
        "\n\nAdd each missing partner to the program's transferPartnersFrom in lib/globalPrograms.ts."
      );
    }
  });

  it("every partner in globalPrograms.ts transferPartnersFrom has an entry in transferBonuses.ts", () => {
    // Build reverse map: longName → shortName
    const longToShort = new Map(
      Object.entries(BANK_NAME_MAP).map(([short, long]) => [long, short])
    );

    const bonusKeys = new Set(
      TRANSFER_BONUSES.map(b => `${b.from}::${b.to}`)
    );

    const phantom: string[] = [];

    for (const prog of GLOBAL_PROGRAMS) {
      for (const partner of prog.transferPartnersFrom) {
        const shortPartner = longToShort.get(partner) ?? partner;
        const key = `${shortPartner}::${prog.name}`;
        if (!bonusKeys.has(key)) {
          phantom.push(`globalPrograms["${prog.name}"].transferPartnersFrom contains "${partner}" but no matching entry in transferBonuses.ts`);
        }
      }
    }

    if (phantom.length > 0) {
      throw new Error(
        `${phantom.length} phantom partner(s) in globalPrograms.ts not in transferBonuses.ts:\n` +
        phantom.map(p => `  • ${p}`).join("\n") +
        "\n\nEither add the transfer to data/transferBonuses.ts or remove it from globalPrograms.ts."
      );
    }
  });
});

// ---------------------------------------------------------------------------
// 4. milesPrices.ts ↔ globalPrograms.ts marketValueCents
// ---------------------------------------------------------------------------

describe("milesPrices.ts ↔ globalPrograms.ts marketValueCents", () => {
  it("marketValueCents matches milesPrices.ts for all programs present in both files", () => {
    const mismatches: string[] = [];

    for (const prog of GLOBAL_PROGRAMS) {
      const canonical = MILES_PRICE_MAP.get(prog.name);
      if (canonical === undefined) continue; // program not in milesPrices.ts — fallback is expected

      if (prog.marketValueCents !== canonical) {
        mismatches.push(
          `"${prog.name}": globalPrograms=${prog.marketValueCents}¢  milesPrices=${canonical}¢`
        );
      }
    }

    if (mismatches.length > 0) {
      throw new Error(
        `${mismatches.length} marketValueCents mismatch(es) between globalPrograms.ts and milesPrices.ts:\n` +
        mismatches.map(m => `  • ${m}`).join("\n") +
        "\n\nUpdate globalPrograms.ts to match the canonical values in data/milesPrices.ts."
      );
    }
  });
});

// ---------------------------------------------------------------------------
// 5. milesPrices.ts ↔ milesAcquisition.ts marketValueCents
// ---------------------------------------------------------------------------

describe("milesPrices.ts ↔ milesAcquisition.ts marketValueCents", () => {
  it("marketValueCents matches milesPrices.ts for all programs supported by the acquisition engine", () => {
    const mismatches: string[] = [];

    for (const programName of supportedPrograms()) {
      const canonical = MILES_PRICE_MAP.get(programName);
      if (canonical === undefined) continue;

      const acqData = ACQUISITION_PROGRAM_DATA[programName];
      if (!acqData) continue;

      if (acqData.marketValueCents !== canonical) {
        mismatches.push(
          `"${programName}": milesAcquisition=${acqData.marketValueCents}¢  milesPrices=${canonical}¢`
        );
      }
    }

    if (mismatches.length > 0) {
      throw new Error(
        `${mismatches.length} marketValueCents mismatch(es) between milesAcquisition.ts and milesPrices.ts:\n` +
        mismatches.map(m => `  • ${m}`).join("\n") +
        "\n\nUpdate lib/milesAcquisition.ts to match the canonical values in data/milesPrices.ts."
      );
    }
  });
});

// ---------------------------------------------------------------------------
// 6. milesAcquisition.ts transferPartnersFrom ↔ transferBonuses.ts
// ---------------------------------------------------------------------------

describe("milesAcquisition.ts transferPartnersFrom ↔ transferBonuses.ts", () => {
  // Build reverse map once
  const longToShort = new Map(
    Object.entries(BANK_NAME_MAP).map(([short, long]) => [long, short])
  );
  const bonusKeys = new Set(TRANSFER_BONUSES.map(b => `${b.from}::${b.to}`));

  it("every partner in milesAcquisition.ts transferPartnersFrom has an entry in transferBonuses.ts", () => {
    const phantom: string[] = [];

    for (const [progName, data] of Object.entries(ACQUISITION_PROGRAM_DATA)) {
      for (const partner of data.transferPartnersFrom) {
        const shortPartner = longToShort.get(partner) ?? partner;
        const key = `${shortPartner}::${progName}`;
        if (!bonusKeys.has(key)) {
          phantom.push(`milesAcquisition["${progName}"].transferPartnersFrom contains "${partner}" but no entry in transferBonuses.ts`);
        }
      }
    }

    if (phantom.length > 0) {
      throw new Error(
        `${phantom.length} phantom partner(s) in milesAcquisition.ts not in transferBonuses.ts:\n` +
        phantom.map(p => `  • ${p}`).join("\n") +
        "\n\nEither add the transfer to data/transferBonuses.ts or remove it from milesAcquisition.ts."
      );
    }
  });

  it("every transfer in transferBonuses.ts for acquisition-supported programs appears in milesAcquisition.ts", () => {
    const missing: string[] = [];

    for (const bonus of TRANSFER_BONUSES) {
      if (!(bonus.to in ACQUISITION_PROGRAM_DATA)) continue; // program not in acquisition engine — skip

      const longFrom = longName(bonus.from);
      const data = ACQUISITION_PROGRAM_DATA[bonus.to];
      if (!data.transferPartnersFrom.includes(longFrom)) {
        missing.push(`milesAcquisition["${bonus.to}"].transferPartnersFrom missing "${longFrom}"`);
      }
    }

    if (missing.length > 0) {
      throw new Error(
        `${missing.length} transfer(s) in transferBonuses.ts not reflected in milesAcquisition.ts:\n` +
        missing.map(m => `  • ${m}`).join("\n") +
        "\n\nAdd each missing partner to the program's transferPartnersFrom in lib/milesAcquisition.ts."
      );
    }
  });
});
