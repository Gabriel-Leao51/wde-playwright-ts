import type { Locator, Page } from '@playwright/test';

/** The site footer (`contentinfo`) shared by every page. Admins only get the legal row. */
export class Footer {
  readonly root: Locator;
  readonly tagline: Locator;
  /** The "Shop by department" navigation; absent for admins. */
  readonly departmentNav: Locator;
  readonly photoCreditsLink: Locator;

  constructor(readonly page: Page) {
    this.root = page.getByRole('contentinfo');
    this.tagline = this.root.getByText('A general store', { exact: false });
    this.departmentNav = this.root.getByRole('navigation', { name: 'Shop by department' });
    this.photoCreditsLink = this.root.getByRole('link', { name: 'Photo credits' });
  }

  departmentLink(label: string): Locator {
    return this.departmentNav.getByRole('link', { name: label, exact: true });
  }
}
