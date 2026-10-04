import { test, expect } from '@playwright/test';

test.describe('Tasks module (unauthenticated)', () => {
  test('redirects /tasks to login', async ({ page }) => {
    await page.goto('/tasks');
    await expect(page).toHaveURL(/login/);
  });
});
