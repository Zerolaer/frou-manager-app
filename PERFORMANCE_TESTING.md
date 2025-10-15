# Performance Testing Guide

## 📊 Overview

Это руководство по тестированию производительности Frou Manager App.

**Цели производительности:**
- First Contentful Paint (FCP): < 1.8s
- Largest Contentful Paint (LCP): < 2.5s
- Time to Interactive (TTI): < 3.5s
- Total Blocking Time (TBT): < 200ms
- Cumulative Layout Shift (CLS): < 0.1
- Bundle Size: < 700 KB (gzipped < 200 KB)

---

## 🛠️ Tools

### 1. Lighthouse
**Purpose:** Overall performance audit

```bash
# Run from Chrome DevTools
# Or via CLI:
npm install -g lighthouse
lighthouse https://your-app.com --view
```

### 2. Chrome DevTools Performance Tab
**Purpose:** Detailed runtime analysis

1. Open DevTools → Performance
2. Click Record
3. Perform actions
4. Stop recording
5. Analyze flame chart

### 3. WebPageTest
**Purpose:** Real-world performance testing

URL: https://www.webpagetest.org/

### 4. Bundle Analyzer
**Purpose:** Analyze bundle size

```bash
npm install -g vite-bundle-visualizer
npx vite-bundle-visualizer
```

---

## 📈 Performance Metrics

### Web Vitals

#### 1. Largest Contentful Paint (LCP)
**Target:** < 2.5s  
**What:** Time for largest content element to render

**How to test:**
```javascript
// Add to console
new PerformanceObserver((list) => {
  const entries = list.getEntries();
  const lastEntry = entries[entries.length - 1];
  console.log('LCP:', lastEntry.renderTime || lastEntry.loadTime);
}).observe({ entryTypes: ['largest-contentful-paint'] });
```

**How to improve:**
- Optimize images (WebP, lazy loading)
- Reduce JavaScript execution time
- Implement code splitting
- Use CDN

#### 2. First Input Delay (FID)
**Target:** < 100ms  
**What:** Time from first user interaction to browser response

**How to test:**
- Use Lighthouse "Total Blocking Time" as proxy
- Real User Monitoring (RUM)

**How to improve:**
- Reduce JavaScript execution
- Break up long tasks
- Use Web Workers for heavy computations
- Defer non-critical JavaScript

#### 3. Cumulative Layout Shift (CLS)
**Target:** < 0.1  
**What:** Visual stability during page load

**How to test:**
```javascript
// Add to console
let cls = 0;
new PerformanceObserver((list) => {
  list.getEntries().forEach((entry) => {
    if (!entry.hadRecentInput) {
      cls += entry.value;
      console.log('CLS:', cls);
    }
  });
}).observe({ entryTypes: ['layout-shift'] });
```

**How to improve:**
- Set dimensions for images/videos
- Reserve space for dynamic content
- Avoid inserting content above existing content
- Use CSS Grid/Flexbox properly

---

## 🧪 Performance Test Scenarios

### Scenario 1: Initial Load

**Goal:** Fast initial page load

**Steps:**
1. Clear cache
2. Open DevTools Network tab
3. Set throttling to "Fast 3G"
4. Navigate to app
5. Record metrics

**Metrics to check:**
- [ ] DOMContentLoaded < 2s
- [ ] Load event < 3s
- [ ] FCP < 1.8s
- [ ] LCP < 2.5s
- [ ] Number of requests < 30
- [ ] Total transfer size < 1 MB

### Scenario 2: Cached Load

**Goal:** Instant load with cache

**Steps:**
1. Load app once
2. Hard refresh (not clearing cache)
3. Record metrics

**Metrics to check:**
- [ ] DOMContentLoaded < 1s
- [ ] Load event < 1.5s
- [ ] Service Worker cache hit > 80%

### Scenario 3: Large Dataset

**Goal:** Smooth performance with lots of data

**Test data:**
- 1000 tasks
- 500 finance entries
- 100 notes

**Steps:**
1. Load page with large dataset
2. Scroll through lists
3. Search/filter
4. Record FPS and memory

**Metrics to check:**
- [ ] Scroll FPS > 55
- [ ] Search debounce working
- [ ] Virtual scrolling enabled
- [ ] Memory usage stable (no leaks)

### Scenario 4: Mobile Performance

**Goal:** Good performance on mobile devices

**Device emulation:**
- Pixel 5 (Chrome DevTools)
- CPU: 4x slowdown
- Network: Slow 3G

**Metrics to check:**
- [ ] TTI < 5s
- [ ] FCP < 2.5s
- [ ] Touch response < 100ms
- [ ] Smooth scrolling

### Scenario 5: Offline Performance

**Goal:** App works offline

**Steps:**
1. Load app online
2. Disconnect network
3. Navigate around
4. Try CRUD operations

**Checks:**
- [ ] Pages load from cache
- [ ] Proper offline messaging
- [ ] Queued actions sync when online

---

## 📦 Bundle Size Analysis

### Current Bundle

**Target:** < 700 KB total (< 200 KB gzipped)

### Analyze Bundle

```bash
npm run build
du -sh dist
du -sh dist/assets/*.js
```

### Check Chunk Sizes

```javascript
// vite.config.ts already configured for code splitting
manualChunks: {
  'vendor-react': ['react', 'react-dom'],
  'vendor-supabase': ['@supabase/supabase-js'],
  'vendor-date': ['date-fns'],
  'vendor-other': // other node_modules
}
```

### Optimization Checklist

- [ ] Tree shaking enabled
- [ ] Minification enabled
- [ ] Gzip compression
- [ ] Lazy loading for routes
- [ ] Lazy loading for heavy components
- [ ] Images optimized (WebP)
- [ ] Unused dependencies removed

---

## 🔍 Runtime Performance

### JavaScript Performance

**Test long tasks:**

```javascript
// DevTools → Performance → Record
// Look for yellow blocks (long tasks)
// Anything > 50ms is suspicious
```

**Memory leaks:**

```javascript
// DevTools → Memory → Take heap snapshot
// Navigate around app
// Take another snapshot
// Compare snapshots
// Look for detached DOM nodes
```

### React Performance

**Use React DevTools Profiler:**

1. Install React DevTools extension
2. Open Profiler tab
3. Click Record
4. Perform actions
5. Stop and analyze

**Look for:**
- Unnecessary re-renders
- Components with high render time
- Components rendering too often

### Network Performance

**Analyze in Network tab:**

**Checks:**
- [ ] No duplicate requests
- [ ] Request deduplication working
- [ ] Batch requests used
- [ ] Resources cached properly
- [ ] No waterfall delays
- [ ] CDN used for static assets

---

## 🚀 Performance Optimization Guide

### 1. Code Splitting

**Already implemented:**
```typescript
// main.tsx
const Login = lazy(() => import('./pages/Login'));
const Home = lazy(() => import('./pages/Home'));
// etc.
```

**Verify it's working:**
- Check Network tab
- Pages should load separate chunks

### 2. Image Optimization

**Checklist:**
- [ ] Use WebP format
- [ ] Lazy load images
- [ ] Responsive images (srcset)
- [ ] Proper dimensions set
- [ ] Compress images

**Example:**
```jsx
<img
  src="image.webp"
  loading="lazy"
  width="400"
  height="300"
  alt="Description"
/>
```

### 3. Debouncing

**Already implemented:**
```typescript
// hooks/useDebounce.ts
const debouncedValue = useDebounce(searchTerm, 500);
```

**Verify:**
- Search input doesn't lag
- API calls are debounced

### 4. Virtualization

**Check if needed for:**
- Long lists (> 100 items)
- Notes list
- Tasks list

**Library:** react-window or react-virtual

### 5. Memoization

**Use React.memo for:**
- Components that render often
- Components with expensive render logic

**Use useMemo/useCallback for:**
- Expensive calculations
- Functions passed as props

### 6. Service Worker Optimization

**Check:**
- [ ] Static assets cached
- [ ] API responses cached (with TTL)
- [ ] Stale-while-revalidate strategy
- [ ] Cache version updated on deploy

---

## 📊 Monitoring in Production

### Setup Real User Monitoring (RUM)

**Recommended tools:**
- Google Analytics 4 (Web Vitals)
- LogRocket
- Sentry Performance

**Metrics to track:**
- Core Web Vitals (LCP, FID, CLS)
- Page load times
- API response times
- Error rates
- User device/network distribution

### Performance Budget

Set alerts for:
- Bundle size increase > 10%
- LCP > 3s
- FID > 150ms
- CLS > 0.15

---

## 🧪 Load Testing

### Simulate High Load

**Tool:** Artillery or k6

```yaml
# artillery.yml
config:
  target: "https://your-app.com"
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - flow:
      - get:
          url: "/"
      - think: 2
      - get:
          url: "/tasks"
```

**Run:**
```bash
npm install -g artillery
artillery run artillery.yml
```

---

## 📋 Performance Testing Checklist

### Before Release

- [ ] Run Lighthouse (score > 90)
- [ ] Check bundle size (< 700 KB)
- [ ] Test on slow network (3G)
- [ ] Test on slow device (4x CPU slowdown)
- [ ] Check for memory leaks
- [ ] Verify code splitting works
- [ ] Check Service Worker caching
- [ ] Test with large datasets
- [ ] Verify debouncing works
- [ ] Check for layout shifts
- [ ] Test offline mode
- [ ] Verify lazy loading

### After Release

- [ ] Monitor Web Vitals
- [ ] Check error rates
- [ ] Monitor bundle size
- [ ] Track performance regressions
- [ ] User feedback on performance

---

## 📈 Performance Test Results Template

```markdown
## Performance Test Results

**Date:** YYYY-MM-DD
**Version:** x.x.x
**Tester:** Name

### Lighthouse Scores
- Performance: __/100
- Accessibility: __/100
- Best Practices: __/100
- SEO: __/100

### Web Vitals
- LCP: __ s (target: < 2.5s)
- FID: __ ms (target: < 100ms)
- CLS: __ (target: < 0.1)

### Bundle Size
- Total: __ KB (gzipped: __ KB)
- vendor-react: __ KB
- vendor-supabase: __ KB
- vendor-other: __ KB
- app code: __ KB

### Load Performance
- DOMContentLoaded: __ s
- Load event: __ s
- First Contentful Paint: __ s
- Time to Interactive: __ s

### Runtime Performance
- Scroll FPS: __ (target: > 55)
- Memory usage: __ MB
- Memory leaks: Yes/No

### Network
- Total requests: __
- Total transfer: __ MB
- Cached requests: __%

### Issues Found
1. ...
2. ...

### Recommendations
1. ...
2. ...
```

---

## 🔗 Resources

- [Web.dev Performance](https://web.dev/performance/)
- [Chrome DevTools Performance](https://developer.chrome.com/docs/devtools/performance/)
- [React Performance](https://react.dev/learn/render-and-commit#optimizing-performance)
- [Vite Performance](https://vitejs.dev/guide/performance.html)

---

**Last Updated:** October 15, 2025

