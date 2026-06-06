import { PROGRAMS } from '@/data/programs';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';

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
      title: 'Programme Not Found',
    };
  }

  return {
    title: `${program.name} - KEZA`,
    description: `${program.name} loyalty programme details. ${program.bestUse}`,
    openGraph: {
      title: `${program.name} - KEZA`,
      description: `${program.name} loyalty programme. ${program.bestUse}`,
      type: 'website',
      url: `https://keza.co/programmes/${program.id}`,
    },
  };
}

export default async function ProgrammePage(props: ProgrammePageProps) {
  const params = await props.params;
  const program = PROGRAMS.find((p) => p.id === params.slug);

  if (!program) {
    notFound();
  }

  const allianceLabel = {
    star: 'Star Alliance',
    oneworld: 'Oneworld',
    skyteam: 'SkyTeam',
  };

  const typeLabel = {
    airline: 'Airline',
    hotel: 'Hotel',
    transfer: 'Transfer Card',
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Back link */}
        <Link
          href="/programmes"
          className="text-blue-600 hover:text-blue-800 mb-6 inline-block"
        >
          ← Back to Programmes
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-4xl">{program.flag}</span>
            <h1 className="text-4xl font-bold">{program.name}</h1>
          </div>
          <p className="text-gray-600 text-lg">{program.company}</p>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Type</p>
            <p className="text-lg font-semibold">{typeLabel[program.type]}</p>
          </div>

          {program.alliance && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Alliance</p>
              <p className="text-lg font-semibold">
                {allianceLabel[program.alliance]}
              </p>
            </div>
          )}

          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Value per Mile/Point</p>
            <p className="text-lg font-semibold">{program.cpmCents}¢</p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">KEZA Score</p>
            <p className="text-lg font-semibold">{program.score}/100</p>
          </div>
        </div>

        {/* Best Use */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-2">Best Use</h2>
          <p className="text-gray-700">{program.bestUse}</p>
        </div>

        {/* Transfer Partners */}
        {program.transferPartners.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-2">Transfer Partners</h2>
            <ul className="list-disc list-inside text-gray-700 space-y-1">
              {program.transferPartners.map((partner) => (
                <li key={partner} className="capitalize">
                  {partner.replace('-', ' ')}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Regions */}
        {program.regions.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-2">Available Regions</h2>
            <div className="flex flex-wrap gap-2">
              {program.regions.map((region) => (
                <span
                  key={region}
                  className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm capitalize"
                >
                  {region.replace('-', ' ')}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
