import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { Locator, Page } from '@playwright/test';

import { testDataFile } from '../test-data';

/** Fields of the admin add/edit product form; unset fields are left untouched. */
export interface ProductFormData {
  title?: string;
  /** Image file name under `test-data/`. */
  image?: string;
  summary?: string;
  price?: number;
  /** Department option value, e.g. `'Office'`. */
  department?: string;
  description?: string;
}

const mimeTypes: Record<string, string> = { '.jpg': 'image/jpeg', '.png': 'image/png' };

/**
 * Product pages: the admin list (/admin/products), the add/edit form, and the customer-facing
 * product list and details page. Products are looked up by title.
 */
export class ProductsPage {
  readonly manageProductsLink: Locator;
  readonly addProductLink: Locator;

  // Add/edit form
  readonly titleInput: Locator;
  readonly imageInput: Locator;
  readonly imageDropzoneHint: Locator;
  readonly imagePreview: Locator;
  readonly summaryInput: Locator;
  readonly priceInput: Locator;
  readonly launchDateInput: Locator;
  /** Quill's editable surface; the real `<textarea name="description">` is hidden and synced by Quill. */
  readonly descriptionEditor: Locator;
  readonly saveButton: Locator;

  // Delete confirmation (admin list)
  readonly deleteDialog: Locator;
  readonly confirmDeleteButton: Locator;
  readonly cancelDeleteButton: Locator;

  // Customer product details
  readonly addToCartButton: Locator;
  /** The sanitized description HTML as rendered on the product details page. */
  readonly renderedDescription: Locator;

  // Customer catalog: filter/sort form and live search
  /** A product card in the currently rendered list, in whatever order the server sent them. */
  readonly items: Locator;
  /** Shared by the catalog's department filter and the admin form's department field - both are
   * labeled "Department", and a page only ever renders one of them. */
  readonly departmentSelect: Locator;
  readonly sortSelect: Locator;
  readonly filterButton: Locator;
  readonly searchInput: Locator;

  constructor(readonly page: Page) {
    const main = page.getByRole('main');
    this.manageProductsLink = page
      .getByRole('banner')
      .getByRole('link', { name: 'Manage Products' });
    this.addProductLink = main.getByRole('link', { name: 'Add Product' });

    this.titleInput = main.getByLabel('Title');
    this.imageInput = main.getByLabel('Image');
    this.imageDropzoneHint = main.getByText('Drag and drop an image here, or click to browse');
    this.imagePreview = main.getByRole('img', { name: 'Selected image.' });
    this.summaryInput = main.getByLabel('Summary');
    this.priceInput = main.getByLabel('Price');
    this.departmentSelect = main.getByLabel('Department');
    this.launchDateInput = main.getByLabel('Launch Date');
    // Quill's contenteditable has no role or label (its <label> points at the wrapper div).
    // eslint-disable-next-line playwright/no-raw-locators
    this.descriptionEditor = main.locator('.ql-editor');
    this.saveButton = main.getByRole('button', { name: 'Save' });

    this.deleteDialog = page.getByRole('dialog');
    this.confirmDeleteButton = this.deleteDialog.getByRole('button', { name: 'Delete' });
    this.cancelDeleteButton = this.deleteDialog.getByRole('button', { name: 'Cancel' });

    this.addToCartButton = main.getByRole('button', { name: 'Add to Cart' });
    // A plain <div> with no role; the XSS checks also need tag-level queries (script, img) inside it.
    // eslint-disable-next-line playwright/no-raw-locators
    this.renderedDescription = main.locator('#product-description');

    this.items = main.getByRole('article');
    this.sortSelect = main.getByLabel('Sort by');
    this.filterButton = main.getByRole('button', { name: 'Filter' });
    this.searchInput = main.getByRole('combobox', { name: 'Search' });
  }

  async visitAdminList(): Promise<void> {
    await this.page.goto('/admin/products');
  }

  // The navigation actions below wait for `load`, not just the URL: these pages wire up their
  // buttons, Quill and flatpickr in deferred scripts, and acting earlier races them (seen on WebKit).

  async openAdminListFromHeader(): Promise<void> {
    await this.manageProductsLink.click();
    await this.page.waitForURL('**/admin/products');
  }

  async openAddForm(): Promise<void> {
    await this.addProductLink.click();
    await this.page.waitForURL('**/admin/products/new');
  }

  async openEditForm(productTitle: string): Promise<void> {
    await this.editLink(productTitle).click();
    await this.page.waitForURL(/\/admin\/products\/(?!new$)[^/]+$/);
  }

  async openDetails(productTitle: string): Promise<void> {
    await this.viewDetailsLink(productTitle).click();
    await this.page.waitForURL('**/products/*');
  }

  /** A product card in the admin or customer product list. */
  item(productTitle: string): Locator {
    return this.items.filter({
      has: this.page.getByRole('heading', { name: productTitle, level: 2, exact: true }),
    });
  }

  itemImage(productTitle: string): Locator {
    return this.item(productTitle).getByRole('img', { name: productTitle, exact: true });
  }

  editLink(productTitle: string): Locator {
    return this.item(productTitle).getByRole('link', { name: 'View & Edit' });
  }

  deleteButton(productTitle: string): Locator {
    return this.item(productTitle).getByRole('button', { name: 'Delete' });
  }

  viewDetailsLink(productTitle: string): Locator {
    return this.item(productTitle).getByRole('link', { name: 'View Details' });
  }

  async fillForm(data: ProductFormData): Promise<void> {
    if (data.title !== undefined) await this.titleInput.fill(data.title);
    if (data.image !== undefined) await this.imageInput.setInputFiles(testDataFile(data.image));
    if (data.summary !== undefined) await this.summaryInput.fill(data.summary);
    if (data.price !== undefined) await this.priceInput.fill(String(data.price));
    if (data.department !== undefined) await this.departmentSelect.selectOption(data.department);
    if (data.description !== undefined) await this.descriptionEditor.fill(data.description);
  }

  /** Replace the description with `text` and make it bold via the Quill toolbar. */
  async setDescriptionBold(text: string): Promise<void> {
    await this.descriptionEditor.fill(text);
    await this.descriptionEditor.press('ControlOrMeta+A');
    // Quill's toolbar buttons are icon-only, with no accessible name.
    // eslint-disable-next-line playwright/no-raw-locators
    await this.page.locator('.ql-toolbar button.ql-bold').click();
  }

  /**
   * Put raw HTML straight into the editor's DOM, bypassing the toolbar, the way an attacker with
   * devtools would. It's the only way to get markup the toolbar can't produce to the server's sanitizer.
   */
  async setDescriptionHtml(html: string): Promise<void> {
    await this.descriptionEditor.evaluate((editor, markup) => {
      editor.innerHTML = markup;
      editor.dispatchEvent(new InputEvent('input', { bubbles: true }));
    }, html);
  }

  /**
   * Pick a launch date in the flatpickr calendar. `day` is flatpickr's aria-label for the day,
   * e.g. "January 20, 2025". The calendar opens on the current month, so this first selects the
   * target month and year.
   */
  async setLaunchDate(day: string): Promise<void> {
    const target = new Date(day);
    if (Number.isNaN(target.getTime())) throw new Error(`Not a date: "${day}"`);

    await this.launchDateInput.click();
    await this.page
      .getByRole('combobox', { name: 'Month' })
      .selectOption({ label: target.toLocaleString('en-US', { month: 'long' }) });
    const year = this.page.getByRole('spinbutton', { name: 'Year' });
    await year.fill(String(target.getFullYear()));
    await year.press('Enter');
    await this.page.getByLabel(day, { exact: true }).click();
  }

  /**
   * Drop an image file from `test-data/` onto the upload dropzone. Playwright has no file-drop
   * helper, so this builds a real `File` in the page and dispatches a `drop` event carrying it.
   */
  async dropImage(fileName: string): Promise<void> {
    const bytes = (await readFile(testDataFile(fileName))).toString('base64');
    const mimeType = mimeTypes[path.extname(fileName).toLowerCase()] ?? 'application/octet-stream';
    const dataTransfer = await this.page.evaluateHandle(
      ({ base64, name, type }) => {
        const binary = atob(base64);
        const data = Uint8Array.from(binary, (char) => char.charCodeAt(0));
        const transfer = new DataTransfer();
        transfer.items.add(new File([data], name, { type }));
        return transfer;
      },
      { base64: bytes, name: fileName, type: mimeType },
    );
    // The event bubbles from the hint text up to the dropzone's listener.
    await this.imageDropzoneHint.dispatchEvent('drop', { dataTransfer });
  }

  /**
   * A tag inside the rendered description, e.g. checking a sanitizer stripped a "script" or
   * "img" element. Arbitrary rendered HTML tags have no accessible role to query by.
   */
  descriptionTag(tag: string): Locator {
    return this.renderedDescription.locator(tag);
  }

  /**
   * Open the customer-facing details page of a product from the admin list. Admins get
   * "View & Edit" instead of "View Details", so the product id is taken from that link.
   */
  async openCustomerPageFromAdminList(productTitle: string): Promise<void> {
    const href = await this.editLink(productTitle).getAttribute('href');
    const productId = href?.split('/').pop();
    if (!productId) throw new Error(`No product id in the "View & Edit" link of "${productTitle}"`);
    await this.page.goto(`/products/${productId}`);
  }

  async visitCatalog(): Promise<void> {
    await this.page.goto('/products');
  }

  async visitCatalogFilteredByDepartment(department: string): Promise<void> {
    await this.page.goto(`/products?department=${encodeURIComponent(department)}`);
  }

  async visitCatalogSortedBy(sort: string): Promise<void> {
    await this.page.goto(`/products?sort=${encodeURIComponent(sort)}`);
  }

  /**
   * Select a department in the catalog's filter form and submit it. Waits for the resulting
   * navigation: without it, reading the list right after the click can hit a torn-down execution
   * context mid-navigation, the same WebKit race documented on `listedTitles`.
   */
  async filterByDepartment(departmentLabel: string): Promise<void> {
    await this.departmentSelect.selectOption({ label: departmentLabel });
    await this.filterButton.click();
    await this.page.waitForURL(/\/products\?/);
  }

  /** Select an option in the catalog's sort form and submit it. See `filterByDepartment`. */
  async sortByOption(sortLabel: string): Promise<void> {
    await this.sortSelect.selectOption({ label: sortLabel });
    await this.filterButton.click();
    await this.page.waitForURL(/\/products\?/);
  }

  /**
   * Titles of the currently rendered product list, in server order. Waits for the list to render
   * first: a preceding filter/sort submission or `goto` is a full navigation, and reading text
   * immediately can hit a torn-down execution context mid-navigation (seen on WebKit's timing).
   */
  async listedTitles(): Promise<string[]> {
    await this.items.first().waitFor();
    return this.items.getByRole('heading', { level: 2 }).allInnerTexts();
  }

  /** Prices of the currently rendered product list, in server order. See `listedTitles`. */
  async listedPrices(): Promise<number[]> {
    await this.items.first().waitFor();
    // The price has no accessible role or label to query by.
    // eslint-disable-next-line playwright/no-raw-locators
    const priceTexts = await this.items.locator('.product-item-price').allInnerTexts();
    return priceTexts.map((text) => Number.parseFloat(text.replace('$', '')));
  }

  /** A live-search suggestion in the search combobox's results list, matched by product title. */
  searchSuggestion(productTitle: string): Locator {
    return this.page.getByRole('option', { name: productTitle });
  }
}
