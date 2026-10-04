import { PROGRAMS } from "@/data/programs";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL } from "@/lib/siteConfig";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

interface ProgrammePageProps {
  params: Promise<{
    slug: string;
  }>;
}

export function generateStaticParams() {
  return PROGRAMS.map((program) => ({
    slug: program.id,
  }));
}

export async function generateMetadata(
  props: ProgrammePageProps
): Promise<Metadata> {
  const params = await props.params;
  const program = PROGRAMS.find((p) => p.id === params.slug);

  if (!program) {
    return {
      title: "Program Not Found",
    };
  }

  return {
    title: `${program.name} - Xalifly`,
    description: `${program.name} loyalty program details. ${program.bestUse}`,
    alternates: {
      canonical: `${SITE_URL}/en/programmes/${program.id}`,
      languages: {
        fr: `${SITE_URL}/programmes/${program.id}`,
        en: `${SITE_URL}/en/programmes/${program.id}`,
        "x-default": `${SITE_URL}/programmes/${program.id}`,
      },
    },
    openGraph: {
      title: `${program.name} - Xalifly`,
      description: `${program.name} loyalty program. ${program.bestUse}`,
      type: "website",
      url: `${SITE_URL}/en/programmes/${program.id}`,
    },
  };
}

export default async function EnProgrammePage(props: ProgrammePageProps) {
  const params = await props.params;
  const program = PROGRAMS.find((p) => p.id === params.slug);

  if (!program) {
    notFound();
  }

  const allianceLabel = {
    star: "Star Alliance",
    oneworld: "Oneworld",
    skyteam: "SkyTeam",
  };

  const typeLabel = {
    airline: "Airline",
    hotel: "Hotel",
    transfer: "Transfer Card",
  };

  const details = [
    { label: "Type", value: typeLabel[program.type] },
    ...(program.alliance
      ? [{ label: "Alliance", value: allianceLabel[program.alliance] }]
      : []),
    { label: "Value per Mile/Point", value: `${program.cpmCents}¢` },
    { label: "Xalifly Score", value: `${program.score}/100` },
  ];

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Header lang="en" />

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        <Link
          href="/en/programmes"
          className="inline-flex text-sm font-semibold text-muted hover:text-fg transition-colors"
        >
          ← Back to Programs
        </Link>

        <section className="rounded-2xl border border-border bg-surface p-5 sm:p-7 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-bg border border-border text-3xl">
              {program.flag}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-primary">
                Miles program
              </p>
              <h1 className="mt-1 text-3xl sm:text-4xl font-black text-fg leading-tight break-words">
                {program.name}
              </h1>
              <p className="mt-2 text-base sm:text-lg text-muted">{program.company}</p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {details.map((detail) => (
              <div key={detail.label} className="rounded-xl border border-border bg-bg p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  {detail.label}
                </p>
                <p className="mt-1 text-lg font-bold text-fg">{detail.value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <h2 className="text-xl font-bold text-fg">Best Use</h2>
          <p className="mt-3 text-muted leading-relaxed">{program.bestUse}</p>
        </section>

        {program.transferPartners.length > 0 && (
          <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
            <h2 className="text-xl font-bold text-fg">Transfer Partners</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {program.transferPartners.map((partner) => (
                <span
                  key={partner}
                  className="rounded-full border border-border bg-bg px-3 py-1.5 text-sm font-semibold text-muted capitalize"
                >
                  {partner.replace("-", " ")}
                </span>
              ))}
            </div>
          </section>
        )}

        {program.regions.length > 0 && (
          <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
            <h2 className="text-xl font-bold text-fg">Available Regions</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {program.regions.map((region) => (
                <span
                  key={region}
                  className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary capitalize"
                >
                  {region.replace("-", " ")}
                </span>
              ))}
            </div>
          </section>
        )}

      </main>

      <Footer lang="en" />
    </div>
  );
}
