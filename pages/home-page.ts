import type { Locator, Page } from '@playwright/test';

/** The home page at `/`: hero, department tiles and featured products. */
export class HomePage {
  readonly heading: Locator;
  readonly heroCta: Locator;
  readonly departmentsSection: Locator;
  readonly featuredSection: Locator;
  readonly featuredItems: Locator;
  readonly viewAllLink: Locator;

  constructor(readonly page: Page) {
    const main = page.getByRole('main');
    this.heading = main.getByRole('heading', { level: 1 });
    this.heroCta = main.getByRole('link', { name: 'Shop all products' });
    this.departmentsSection = main.getByRole('region', { name: 'Shop by department' });
    this.featuredSection = main.getByRole('region', { name: 'Featured products' });
    this.featuredItems = this.featuredSection.getByRole('article');
    this.viewAllLink = this.featuredSection.getByRole('link', { name: 'View all products' });
  }

  async visit(): Promise<void> {
    await this.page.goto('/');
  }

  departmentTile(label: string): Locator {
    return this.departmentsSection.getByRole('link', { name: label, exact: true });
  }
}
