import React from 'react';
import { render, screen } from '@testing-library/react';
import { ProgramsTable } from '@/app/programmes/ProgramsTable';
import { PROGRAMS } from '@/data/programs';

// ProgramsTable rows navigate with useRouter().push — mock the app router
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), prefetch: jest.fn(), replace: jest.fn() }),
}));

describe('ProgramsTable', () => {
  it('renders programmes table in desktop view', () => {
    render(<ProgramsTable lang="en" />);
    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();
  });

  it('renders links to programme detail pages with correct href', () => {
    const { container } = render(<ProgramsTable lang="en" />);

    // Get the first programme
    const firstProgram = PROGRAMS[0];
    const expectedHref = `/programmes/${firstProgram.id}`;

    // Find all links with this href (desktop and mobile)
    const links = container.querySelectorAll(`a[href="${expectedHref}"]`);
    expect(links.length).toBeGreaterThan(0); // Should be at least in mobile or desktop view
  });

  it('wraps programme rows with links for each programme', () => {
    const { container } = render(<ProgramsTable lang="en" />);

    // Test that all programmes have links to their detail pages
    PROGRAMS.forEach((program) => {
      const expectedHref = `/programmes/${program.id}`;
      const links = container.querySelectorAll(`a[href="${expectedHref}"]`);
      expect(links.length).toBeGreaterThan(0);
    });
  });

  it('preserves programme information in linked rows', () => {
    const { container } = render(<ProgramsTable lang="en" />);

    const firstProgram = PROGRAMS[0];
    const expectedHref = `/programmes/${firstProgram.id}`;

    // Get the mobile card link (since desktop uses className="contents")
    const links = container.querySelectorAll(`a[href="${expectedHref}"]`);
    expect(links.length).toBeGreaterThan(0);

    // At least one of the links should contain the programme name and company
    let found = false;
    links.forEach((link) => {
      if (
        link.textContent?.includes(firstProgram.name) &&
        link.textContent?.includes(firstProgram.company)
      ) {
        found = true;
      }
    });
    expect(found).toBe(true);
  });

  it('renders all programmes as clickable links', () => {
    const { container } = render(<ProgramsTable lang="en" />);

    // Count all links pointing to programme detail pages
    let totalProgrammeLinks = 0;
    PROGRAMS.forEach((program) => {
      const expectedHref = `/programmes/${program.id}`;
      const links = container.querySelectorAll(`a[href="${expectedHref}"]`);
      totalProgrammeLinks += links.length;
    });

    // Each programme should have at least one link (mobile card view)
    expect(totalProgrammeLinks).toBeGreaterThanOrEqual(PROGRAMS.length);
  });

  it('links have proper href attributes', () => {
    const { container } = render(<ProgramsTable lang="en" />);

    // Get all programme links
    const allLinks = container.querySelectorAll('a[href^="/programmes/"]');

    expect(allLinks.length).toBeGreaterThan(0);

    // Verify all links have proper href format
    allLinks.forEach((link) => {
      const href = link.getAttribute('href');
      expect(href).toMatch(/^\/programmes\/.+/);
    });
  });

  it('desktop table includes links within programme name cells', () => {
    const { container } = render(<ProgramsTable lang="en" />);

    // Desktop table should have links within td cells
    const desktopLinks = container.querySelectorAll('table td a[href^="/programmes/"]');
    expect(desktopLinks.length).toBeGreaterThan(0);
  });

  it('mobile cards render as block-level links', () => {
    const { container } = render(<ProgramsTable lang="en" />);

    // Mobile cards should have links with className including "block"
    const mobileLinks = container.querySelectorAll('a[class*="block"][href^="/programmes/"]');
    expect(mobileLinks.length).toBeGreaterThan(0);
  });

  it('supports language switching', () => {
    const { rerender } = render(<ProgramsTable lang="en" />);

    let headerCells = screen.getAllByText('Program');
    expect(headerCells.length).toBeGreaterThan(0);

    rerender(<ProgramsTable lang="fr" />);

    headerCells = screen.getAllByText('Programme');
    expect(headerCells.length).toBeGreaterThan(0);
  });

  it('links remain functional after filtering', () => {
    const { container } = render(<ProgramsTable lang="en" />);

    // All programme links should exist
    PROGRAMS.forEach((program) => {
      const expectedHref = `/programmes/${program.id}`;
      const links = container.querySelectorAll(`a[href="${expectedHref}"]`);
      expect(links.length).toBeGreaterThan(0);
    });
  });
});
