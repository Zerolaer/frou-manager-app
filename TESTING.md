# Testing Guide - Frou Manager App

## 📋 Table of Contents

- [Overview](#overview)
- [Setup](#setup)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Test Coverage](#test-coverage)
- [CI/CD](#cicd)

---

## Overview

This project uses a comprehensive testing strategy:

1. **Unit Tests** - Vitest + React Testing Library
2. **Integration Tests** - React Testing Library
3. **E2E Tests** - Playwright
4. **Security Tests** - npm audit + XSS validation

**Current Coverage Target:** 60% (baseline)  
**Goal:** 80% coverage

---

## Setup

### Install Dependencies

```bash
npm install
```

### Install Playwright Browsers

```bash
npx playwright install
```

### Environment Variables

Create `.env` file with test credentials:

```bash
cp .env.example .env
# Edit .env with your test Supabase credentials
```

---

## Running Tests

### Unit Tests

```bash
# Run all unit tests
npm test

# Run in watch mode
npm test -- --watch

# Run specific test file
npm test src/tests/unit/validation.test.ts

# Run with UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

### Integration Tests

```bash
# Integration tests are included in unit test suite
npm test src/tests/integration/
```

### E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI mode
npm run test:e2e:ui

# Run specific browser
npx playwright test --project=chromium

# Run in headed mode (see browser)
npx playwright test --headed

# Debug mode
npx playwright test --debug
```

### Security Tests

```bash
# Run security audit
npm run test:security

# Run only npm audit
npm audit

# Run XSS validation tests
npm run test:xss
```

---

## Writing Tests

### Unit Tests

**Location:** `src/tests/unit/`

**Example:**

```typescript
import { describe, it, expect } from 'vitest';
import { sanitizeHtml } from '@/lib/dataValidation';

describe('sanitizeHtml', () => {
  it('should escape HTML characters', () => {
    const input = '<script>alert("XSS")</script>';
    const output = sanitizeHtml(input);
    expect(output).not.toContain('<script>');
  });
});
```

### Integration Tests

**Location:** `src/tests/integration/`

**Example:**

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { TaskCard } from '@/components/TaskCard';

describe('TaskCard', () => {
  it('should render task information', () => {
    render(<TaskCard task={mockTask} />);
    expect(screen.getByText('Test Task')).toBeInTheDocument();
  });
});
```

### E2E Tests

**Location:** `src/tests/e2e/`

**Example:**

```typescript
import { test, expect } from '@playwright/test';

test('should login successfully', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/');
});
```

---

## Test Coverage

### View Coverage Report

```bash
npm run test:coverage
```

Opens HTML report in browser showing:
- Line coverage
- Branch coverage
- Function coverage
- Statement coverage

### Coverage Thresholds

Current thresholds (vitest.config.ts):

```typescript
{
  lines: 60,
  functions: 60,
  branches: 60,
  statements: 60
}
```

### Excluded from Coverage

- `node_modules/`
- `src/tests/`
- `*.d.ts` files
- Config files
- Mock data
- Storybook page

---

## Test Categories

### 1. Security Tests

**Priority:** CRITICAL

Tests for:
- XSS vulnerabilities
- Input sanitization
- Authentication bypass
- Data validation
- Credential exposure

**Files:**
- `src/tests/unit/validation.test.ts`

### 2. Functional Tests

**Priority:** HIGH

Tests for:
- CRUD operations
- User flows
- Form validation
- Navigation
- Data persistence

**Files:**
- `src/tests/e2e/auth.spec.ts`
- `src/tests/e2e/tasks.spec.ts`
- `src/tests/integration/TaskCard.test.tsx`

### 3. Performance Tests

**Priority:** MEDIUM

Tests for:
- Page load times
- Bundle size
- Memory leaks
- Debounce effectiveness

**Tools:**
- Lighthouse CI
- Chrome DevTools
- Playwright performance API

### 4. Accessibility Tests

**Priority:** MEDIUM

Tests for:
- Keyboard navigation
- ARIA labels
- Focus management
- Screen reader compatibility

**Tools:**
- @axe-core/playwright
- Lighthouse accessibility audit

---

## CI/CD

### GitHub Actions Workflow

The CI/CD pipeline runs on:
- Push to `main` or `develop`
- Pull requests to `main` or `develop`

**Pipeline Steps:**

1. **Lint & Type Check**
   - TypeScript compilation
   - Error count validation (max 13)

2. **Security Audit**
   - npm audit
   - Hardcoded secrets check

3. **Unit Tests**
   - Run all unit tests
   - Generate coverage report
   - Upload to Codecov

4. **Build**
   - Production build
   - Bundle size check
   - Upload artifacts

5. **E2E Tests**
   - Run Playwright tests
   - Upload test reports

6. **Lighthouse CI**
   - Performance audit
   - Accessibility audit
   - Best practices check

### Required Secrets

Set in GitHub repository settings:

- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key

---

## Test Best Practices

### DO:

✅ Test user behavior, not implementation  
✅ Use meaningful test descriptions  
✅ Keep tests isolated and independent  
✅ Mock external dependencies  
✅ Test error scenarios  
✅ Use accessibility queries (getByRole, getByLabelText)

### DON'T:

❌ Test implementation details  
❌ Write tests that depend on other tests  
❌ Hard-code test data that could change  
❌ Test third-party library internals  
❌ Skip error handling tests

---

## Debugging Tests

### Unit/Integration Tests

```bash
# Use console.log
npm test -- --reporter=verbose

# Debug in VS Code
# Set breakpoint and use "JavaScript Debug Terminal"
```

### E2E Tests

```bash
# Run in headed mode
npx playwright test --headed

# Debug mode with Playwright Inspector
npx playwright test --debug

# Trace viewer
npx playwright show-trace trace.zip
```

---

## Common Issues

### Issue: Tests fail with "Cannot find module '@/...'

**Solution:** Check `tsconfig.json` and `vitest.config.ts` path aliases

### Issue: Playwright can't find elements

**Solution:** Use Playwright's codegen to generate selectors

```bash
npx playwright codegen http://localhost:5173
```

### Issue: Environment variables not loaded

**Solution:** Check `.env` file exists and has correct format

### Issue: Coverage too low

**Solution:** Focus on testing:
1. Validation functions
2. Utility functions
3. Custom hooks
4. Critical user flows

---

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

## Test Status

### Current Status

- ✅ Unit tests setup complete
- ✅ E2E tests framework ready
- ⚠️ Integration tests partial
- ⚠️ E2E tests need auth setup
- ❌ Visual regression not implemented

### Next Steps

1. Complete integration tests for all modules
2. Set up test user credentials for E2E
3. Implement visual regression testing
4. Increase coverage to 80%
5. Add performance benchmarks

---

**Last Updated:** October 15, 2025  
**Test Framework Versions:**
- Vitest: 1.0.4
- Playwright: 1.40.0
- React Testing Library: 14.1.2

