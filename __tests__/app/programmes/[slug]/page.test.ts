import { generateStaticParams } from '@/app/programmes/[slug]/page';
import { PROGRAMS } from '@/data/programs';

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
});
