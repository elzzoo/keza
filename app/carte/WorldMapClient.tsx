'use client'

import dynamic from 'next/dynamic'
import { MapSkeleton } from '@/components/Skeletons'
import type { DestinationWithRec } from './WorldMap'

const WorldMapDynamic = dynamic(() => import('./WorldMapDynamic').then((mod) => ({ default: mod.WorldMapDynamic })), {
  loading: () => <MapSkeleton />,
  ssr: false,
});

export function WorldMapClient({ destinations, lang }: { destinations: DestinationWithRec[], lang: 'fr' | 'en' }) {
  return <WorldMapDynamic destinations={destinations} lang={lang} />
}
