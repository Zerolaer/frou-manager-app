import { test, expect } from '@playwright/test'

// Стрикт-селекторы: форма имеет ссылку "Forgot password?", из-за неё
// `getByLabel(/password/i)` матчит >1 элемента и падает в strict mode.
// Используем точные имена ролей.
const emailField = (page: import('@playwright/test').Page) =>
  page.getByRole('textbox', { name: 'Email', exact: true })
const passwordField = (page: import('@playwright/test').Page) =>
  page.getByRole('textbox', { name: 'Password', exact: true })
    .or(page.locator('input#password'))
const submitBtn = (page: import('@playwright/test').Page) =>
  page.locator('button[type="submit"]')

test.describe('Authentication Flow', () => {
  test('redirects to /login when not authenticated', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/.*login/)
  })

  test('shows login form fields and submit button', async ({ page }) => {
    await page.goto('/login')
    await expect(emailField(page)).toBeVisible()
    await expect(passwordField(page).first()).toBeVisible()
    await expect(submitBtn(page)).toBeVisible()
  })

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/login')
    await emailField(page).fill('invalid@example.com')
    await passwordField(page).first().fill('wrongpassword')
    await submitBtn(page).click()

    // Ждём появления баннера с ошибкой (он находится над формой)
    await expect(
      page.locator('div.text-red-700, [role="alert"]')
        .or(page.getByText(/invalid|error|неверн|ошиб/i))
    ).toBeVisible({ timeout: 8000 })
  })

  test('navigates to signup and forgot-password', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('link', { name: /sign up|регистрация/i }).click()
    await expect(page).toHaveURL(/signup/)

    await page.goto('/login')
    await page.getByRole('link', { name: /forgot password|забыли пароль/i }).click()
    await expect(page).toHaveURL(/forgot-password/)
  })

  test('email input enforces type=email validation', async ({ page }) => {
    await page.goto('/login')
    await emailField(page).fill('not-an-email')
    await passwordField(page).first().fill('password123')
    await submitBtn(page).click()

    const validationMessage = await emailField(page).evaluate(
      (el: HTMLInputElement) => el.validationMessage
    )
    expect(validationMessage).toBeTruthy()
  })

  test.skip('navigates to home after successful login (requires test creds)', async ({ page }) => {
    await page.goto('/login')
    await emailField(page).fill('test@example.com')
    await passwordField(page).first().fill('testpassword')
    await submitBtn(page).click()
    await expect(page).toHaveURL('/')
  })
})
