import type { Locator, Page } from '@playwright/test';

export type ThemeChoice = 'System' | 'Light' | 'Dark';

/** The site header (`banner`) shared by every page. */
export class Header {
  readonly root: Locator;
  readonly logo: Locator;
  readonly search: Locator;
  /** Named "Cart <count>": the icon is decorative, the label is visually hidden. */
  readonly cartLink: Locator;
  readonly loginLink: Locator;
  readonly signupLink: Locator;
  /** Only customers get the account menu; admins have Logout directly in the header. */
  readonly accountButton: Locator;
  readonly ordersLink: Locator;
  readonly logoutButton: Locator;
  readonly languageButton: Locator;
  readonly themeButton: Locator;
  /** Hamburger that opens the nav panel below the `md` breakpoint (768px). */
  readonly menuButton: Locator;

  constructor(readonly page: Page) {
    this.root = page.getByRole('banner');
    this.logo = this.root.getByRole('link', { name: 'WDE' });
    this.search = this.root.getByRole('combobox', { name: 'Search' });
    this.cartLink = this.root.getByRole('link', { name: 'Cart' });
    this.loginLink = this.root.getByRole('link', { name: 'Login' });
    this.signupLink = this.root.getByRole('link', { name: 'Signup' });
    this.accountButton = this.root.getByRole('button', { name: 'Account' });
    this.ordersLink = this.root.getByRole('link', { name: 'Orders', exact: true });
    this.logoutButton = this.root.getByRole('button', { name: 'Logout' });
    this.languageButton = this.root.getByRole('button', { name: 'Language' });
    this.themeButton = this.root.getByRole('button', { name: 'Theme' });
    this.menuButton = this.root.getByRole('button', { name: 'Menu' });
  }

  async openAccountMenu(): Promise<void> {
    if ((await this.accountButton.getAttribute('aria-expanded')) !== 'true') {
      await this.accountButton.click();
    }
  }

  /** Picks System / Light / Dark from the theme menu; choosing closes the menu. */
  async chooseTheme(choice: ThemeChoice): Promise<void> {
    await this.themeButton.click();
    await this.root.getByRole('button', { name: choice, exact: true }).click();
  }

  themeOption(choice: ThemeChoice): Locator {
    return this.root.getByRole('button', { name: choice, exact: true });
  }
}
