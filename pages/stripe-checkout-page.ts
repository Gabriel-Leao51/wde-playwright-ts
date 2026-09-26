import type { Locator, Page } from '@playwright/test';

/** Stripe's documented test card: any future expiry and any CVC succeed. */
const testCard = { number: '4242424242424242', expiry: '12/34', cvc: '123' } as const;

/**
 * Stripe's hosted Checkout page (checkout.stripe.com), which WDE redirects to on "Buy Products".
 * A third-party page, not part of WDE; its card fields are in the top-level document, not an iframe.
 */
export class StripeCheckoutPage {
  readonly emailInput: Locator;
  readonly cardNumberInput: Locator;
  readonly cardExpiryInput: Locator;
  readonly cardCvcInput: Locator;
  readonly cardholderNameInput: Locator;
  readonly countrySelect: Locator;
  readonly zipInput: Locator;
  /** Link's "save my information" opt-in, checked by default. */
  readonly saveInfoCheckbox: Locator;
  readonly payButton: Locator;

  constructor(readonly page: Page) {
    this.emailInput = page.getByRole('textbox', { name: 'Email' });
    this.cardNumberInput = page.getByRole('textbox', { name: 'Card number' });
    this.cardExpiryInput = page.getByRole('textbox', { name: 'Expiration' });
    // Labelled "Credit or debit card CVC/CVV"; a card icon next to it carries the same label.
    this.cardCvcInput = page.getByRole('textbox', { name: /CVC/ });
    this.cardholderNameInput = page.getByRole('textbox', { name: 'Cardholder name' });
    this.countrySelect = page.getByRole('combobox', { name: 'Country or region' });
    this.zipInput = page.getByRole('textbox', { name: 'ZIP' });
    this.saveInfoCheckbox = page.getByRole('checkbox', {
      name: 'Save my information for faster checkout',
    });
    this.payButton = page.getByRole('button', { name: 'Pay', exact: true });
  }

  async payWithTestCard(email: string, cardholderName: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.cardNumberInput.fill(testCard.number);
    await this.cardExpiryInput.fill(testCard.expiry);
    await this.cardCvcInput.fill(testCard.cvc);
    await this.cardholderNameInput.fill(cardholderName);

    // Force a known country so the billing fields Stripe requires here are deterministic
    // regardless of the runner's IP-detected locale (seen live: a US detection also requires a
    // ZIP and, once "save my information" enrolls the card in Link, a verified phone number that
    // an automated test can never provide).
    await this.countrySelect.selectOption({ label: 'United States' });
    await this.zipInput.fill('94103');
    if (await this.saveInfoCheckbox.isChecked()) await this.saveInfoCheckbox.uncheck();

    await this.payButton.click();
  }
}
