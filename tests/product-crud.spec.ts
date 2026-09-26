import { expect, test } from '../fixtures';

// These scenarios mutate the shared product catalog and depend on each other's state (add, then
// edit, then cancel a delete, then delete), so they must run in order on one worker - the
// TypeScript equivalent of the Python suite's `xdist_group` tag.
test.describe('product CRUD', () => {
  test.describe.configure({ mode: 'serial' });
  test.use({ loggedInAs: 'admin' });

  test.beforeEach(async ({ productsPage }) => {
    await productsPage.visitAdminList();
  });

  test('adds a new product', async ({ page, productsPage }) => {
    await productsPage.openAddForm();
    await productsPage.fillForm({
      title: 'Test Mousepad',
      image: 'mousepad.jpg',
      summary: 'A great mousepad for testing',
      price: 35,
      department: 'Office',
      description: 'Ideal mousepad for automated testing',
    });
    await productsPage.saveButton.click();

    await expect(page).toHaveURL(/\/admin\/products$/);
    await expect(productsPage.item('Test Mousepad')).toBeVisible();
    await expect(productsPage.itemImage('Test Mousepad')).toBeVisible();
  });

  test('edits an existing product', async ({ page, productsPage }) => {
    await productsPage.openEditForm('Test Mousepad');
    await productsPage.fillForm({
      title: 'Edited Test Mousepad',
      summary: 'Edited Test Mousepad Summary',
      price: 40,
      description: 'Edited description of the ideal test mousepad',
    });
    await productsPage.setLaunchDate('January 20, 2025');
    await productsPage.saveButton.click();

    await expect(page).toHaveURL(/\/admin\/products$/);
    await expect(productsPage.item('Edited Test Mousepad')).toBeVisible();

    await productsPage.openEditForm('Edited Test Mousepad');
    await expect(productsPage.launchDateInput).toHaveValue('2025-01-20');

    await productsPage.setDescriptionBold('important note');
    await productsPage.saveButton.click();

    await expect(page).toHaveURL(/\/admin\/products$/);
    await productsPage.openCustomerPageFromAdminList('Edited Test Mousepad');
    await expect(productsPage.descriptionTag('strong')).toContainText('important note');
  });

  test('keeps the product when the delete confirmation is cancelled', async ({ productsPage }) => {
    await productsPage.deleteButton('Edited Test Mousepad').click();
    await expect(productsPage.deleteDialog).toBeVisible();
    await expect(productsPage.deleteDialog).toContainText('Edited Test Mousepad');

    await productsPage.cancelDeleteButton.click();

    await expect(productsPage.item('Edited Test Mousepad')).toBeVisible();
  });

  test('deletes an existing product', async ({ page, productsPage }) => {
    await productsPage.deleteButton('Edited Test Mousepad').click();
    await expect(productsPage.deleteDialog).toBeVisible();

    await productsPage.confirmDeleteButton.click();

    await expect(productsPage.item('Edited Test Mousepad')).toHaveCount(0);
    await expect(page.getByText('Product deleted!')).toBeVisible();
  });

  test('uploads a product image via drag and drop', async ({ page, productsPage }) => {
    await productsPage.openAddForm();
    await productsPage.fillForm({
      title: 'Drag and Drop Mousepad',
      summary: 'A great mousepad for testing',
      price: 35,
      department: 'Office',
      description: 'Ideal mousepad for automated testing',
    });
    await productsPage.dropImage('mousepad.jpg');
    await productsPage.saveButton.click();

    await expect(page).toHaveURL(/\/admin\/products$/);
    await expect(productsPage.item('Drag and Drop Mousepad')).toBeVisible();
    await expect(productsPage.itemImage('Drag and Drop Mousepad')).toBeVisible();

    await productsPage.deleteButton('Drag and Drop Mousepad').click();
    await productsPage.confirmDeleteButton.click();

    await expect(productsPage.item('Drag and Drop Mousepad')).toHaveCount(0);
  });

  test('sanitizes stored XSS payloads in a product description before saving', async ({
    page,
    productsPage,
  }) => {
    await productsPage.openAddForm();
    await productsPage.fillForm({
      title: 'XSS Test Mousepad',
      image: 'mousepad.jpg',
      summary: 'A great mousepad for testing',
      price: 35,
      department: 'Office',
    });
    await productsPage.setDescriptionHtml(
      '<p>Safe <strong>bold</strong> text</p><script>window.xssMarker = true;</script>' +
        "<img src='x' onerror='window.xssMarker = true'>",
    );
    await productsPage.saveButton.click();

    await expect(page).toHaveURL(/\/admin\/products$/);
    await productsPage.openCustomerPageFromAdminList('XSS Test Mousepad');

    await expect(productsPage.renderedDescription).toContainText('Safe bold text');
    await expect(productsPage.descriptionTag('script')).toHaveCount(0);
    await expect(productsPage.descriptionTag('img')).toHaveCount(0);
    const xssMarker = await page.evaluate(
      () => (window as unknown as Record<string, unknown>).xssMarker === true,
    );
    expect(xssMarker).toBe(false);

    await productsPage.visitAdminList();
    await productsPage.deleteButton('XSS Test Mousepad').click();
    await productsPage.confirmDeleteButton.click();

    await expect(productsPage.item('XSS Test Mousepad')).toHaveCount(0);
  });
});

test.describe('add product validation', () => {
  test.use({ loggedInAs: 'admin' });

  test('blocks submission when the required title field is blank', async ({
    page,
    productsPage,
  }) => {
    await productsPage.visitAdminList();
    await productsPage.openAddForm();
    await productsPage.fillForm({
      image: 'mousepad.jpg',
      summary: 'A great mousepad for testing',
      price: 35,
      description: 'Ideal mousepad for automated testing',
    });
    await productsPage.saveButton.click();

    // Native HTML5 validation message wording is browser/locale-specific (Chromium/Firefox say
    // "Please fill out this field.", WebKit says "Fill out this field") - assert the behavior
    // (blocked due to a missing required value, with some message shown), not the exact text.
    const validity = await productsPage.titleInput.evaluate((el: HTMLInputElement) => ({
      valueMissing: el.validity.valueMissing,
      message: el.validationMessage,
    }));
    expect(validity.valueMissing).toBe(true);
    expect(validity.message).not.toBe('');
    await expect(page).toHaveURL(/\/admin\/products\/new$/);
  });
});
