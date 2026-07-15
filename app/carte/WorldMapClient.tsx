'use client'

import { WorldMapDynamic } from './WorldMapDynamic'
import type { DestinationWithRec } from './WorldMap'

export function WorldMapClient({ destinations, lang }: { destinations: DestinationWithRec[], lang: 'fr' | 'en' }) {
  return <WorldMapDynamic destinations={destinations} lang={lang} />
}
