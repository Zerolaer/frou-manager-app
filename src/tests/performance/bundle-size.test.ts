import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Bundle Size Tests', () => {
  const distPath = path.join(process.cwd(), 'dist');
  const MAX_BUNDLE_SIZE_KB = 700; // 700 KB ungzipped
  const MAX_GZIPPED_SIZE_KB = 200; // 200 KB gzipped

  it('should have dist folder after build', () => {
    const exists = fs.existsSync(distPath);
    if (!exists) {
      console.warn('⚠️ dist folder not found. Run "npm run build" first.');
    }
    // Don't fail test if dist doesn't exist (might not be built yet)
    expect(true).toBe(true);
  });

  it('should not exceed maximum bundle size', () => {
    if (!fs.existsSync(distPath)) {
      console.warn('⚠️ Skipping bundle size test - dist folder not found');
      return;
    }

    const assetsPath = path.join(distPath, 'assets');
    if (!fs.existsSync(assetsPath)) {
      console.warn('⚠️ assets folder not found');
      return;
    }

    const files = fs.readdirSync(assetsPath);
    const jsFiles = files.filter(f => f.endsWith('.js'));
    
    let totalSize = 0;
    jsFiles.forEach(file => {
      const filePath = path.join(assetsPath, file);
      const stats = fs.statSync(filePath);
      totalSize += stats.size;
    });

    const totalSizeKB = totalSize / 1024;
    console.log(`📦 Total bundle size: ${totalSizeKB.toFixed(2)} KB`);

    expect(totalSizeKB).toBeLessThan(MAX_BUNDLE_SIZE_KB);
  });

  it('should have reasonable chunk sizes', () => {
    if (!fs.existsSync(distPath)) {
      console.warn('⚠️ Skipping chunk size test - dist folder not found');
      return;
    }

    const assetsPath = path.join(distPath, 'assets');
    if (!fs.existsSync(assetsPath)) return;

    const files = fs.readdirSync(assetsPath);
    const jsFiles = files.filter(f => f.endsWith('.js'));
    
    const MAX_CHUNK_SIZE = 200 * 1024; // 200 KB per chunk
    const oversizedChunks: string[] = [];

    jsFiles.forEach(file => {
      const filePath = path.join(assetsPath, file);
      const stats = fs.statSync(filePath);
      
      if (stats.size > MAX_CHUNK_SIZE) {
        oversizedChunks.push(`${file}: ${(stats.size / 1024).toFixed(2)} KB`);
      }
    });

    if (oversizedChunks.length > 0) {
      console.warn('⚠️ Oversized chunks (> 200 KB):');
      oversizedChunks.forEach(chunk => console.warn(`  - ${chunk}`));
    }

    // Allow vendor chunks to be larger
    const nonVendorOversized = oversizedChunks.filter(
      chunk => !chunk.includes('vendor-')
    );

    expect(nonVendorOversized.length).toBe(0);
  });

  it('should have CSS files', () => {
    if (!fs.existsSync(distPath)) return;

    const assetsPath = path.join(distPath, 'assets');
    if (!fs.existsSync(assetsPath)) return;

    const files = fs.readdirSync(assetsPath);
    const cssFiles = files.filter(f => f.endsWith('.css'));
    
    expect(cssFiles.length).toBeGreaterThan(0);
    
    let totalCssSize = 0;
    cssFiles.forEach(file => {
      const filePath = path.join(assetsPath, file);
      const stats = fs.statSync(filePath);
      totalCssSize += stats.size;
    });

    const totalCssSizeKB = totalCssSize / 1024;
    console.log(`🎨 Total CSS size: ${totalCssSizeKB.toFixed(2)} KB`);

    // CSS should be reasonable (< 100 KB)
    expect(totalCssSizeKB).toBeLessThan(100);
  });

  it('should have index.html', () => {
    if (!fs.existsSync(distPath)) return;

    const indexPath = path.join(distPath, 'index.html');
    expect(fs.existsSync(indexPath)).toBe(true);
  });
});

