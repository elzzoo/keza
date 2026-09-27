/** @jest-environment jsdom */

import ProgrammePage, {
  generateMetadata,
  generateStaticParams,
} from '@/app/programmes/[slug]/page';
import {
  generateMetadata as generateEnMetadata,
  generateStaticParams as generateEnStaticParams,
} from '@/app/en/programmes/[slug]/page';
import { PROGRAMS } from '@/data/programs';
import { SITE_URL } from '@/lib/siteConfig';
import { render, screen } from '@testing-library/react';

describe('/programmes/[slug]', () => {
  it('generates static params for all programs', () => {
    const params = generateStaticParams();
    expect(params.length).toBe(PROGRAMS.length);
    expect(params).toEqual(PROGRAMS.map((p) => ({ slug: p.id })));
  });

  it('includes specific programmes', () => {
    const params = generateStaticParams();
    const slugs = params.map((p) => p.slug);
    expect(slugs).toContain('flying-blue');
    expect(slugs).toContain('krisflyer');
    expect(slugs).toContain('amex-mr');
  });

  it('all slugs are lowercase and hyphen-separated', () => {
    const params = generateStaticParams();
    params.forEach((p) => {
      expect(p.slug).toMatch(/^[a-z0-9\-]+$/);
      expect(p.slug).not.toMatch(/[A-Z]/);
    });
  });

  it('generates English static params for all programs', () => {
    expect(generateEnStaticParams()).toEqual(generateStaticParams());
  });

  it('uses French canonicals and hreflang on French detail pages', async () => {
    const program = PROGRAMS[0];
    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: program.id }),
    });

    expect(metadata.description).toContain(program.bestUseFr);
    expect(metadata.alternates).toEqual({
      canonical: `${SITE_URL}/programmes/${program.id}`,
      languages: {
        fr: `${SITE_URL}/programmes/${program.id}`,
        en: `${SITE_URL}/en/programmes/${program.id}`,
        'x-default': `${SITE_URL}/programmes/${program.id}`,
      },
    });
  });

  it('uses English canonicals and hreflang on English detail pages', async () => {
    const program = PROGRAMS[0];
    const metadata = await generateEnMetadata({
      params: Promise.resolve({ slug: program.id }),
    });

    expect(metadata.alternates).toEqual({
      canonical: `${SITE_URL}/en/programmes/${program.id}`,
      languages: {
        fr: `${SITE_URL}/programmes/${program.id}`,
        en: `${SITE_URL}/en/programmes/${program.id}`,
        'x-default': `${SITE_URL}/programmes/${program.id}`,
      },
    });
  });

  it('renders French labels on the French programme detail page', async () => {
    const program = PROGRAMS[0];
    render(
      await ProgrammePage({
        params: Promise.resolve({ slug: program.id }),
      })
    );

    expect(screen.getByText('← Retour aux programmes')).toBeTruthy();
    expect(screen.getByText('Valeur par mile/point')).toBeTruthy();
    expect(screen.getByText('Meilleur usage')).toBeTruthy();
    expect(screen.getByText(program.bestUseFr)).toBeTruthy();
  });
});
