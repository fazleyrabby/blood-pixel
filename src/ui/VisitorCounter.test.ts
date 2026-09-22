/**
 * Visitor-counter guards — Phase 5 tests.
 * The network call itself is environment-dependent; the guards are pure.
 */

import { describe, it, expect } from 'vitest';
import { isDevLocation, isBotUserAgent, isPreviewHost } from './VisitorCounter';

describe('isDevLocation', () => {
  it('treats local hosts as dev', () => {
    expect(isDevLocation('localhost', '')).toBe(true);
    expect(isDevLocation('127.0.0.1', '')).toBe(true);
    expect(isDevLocation('::1', '')).toBe(true);
    expect(isDevLocation('my-machine.local', '')).toBe(true);
  });

  it('treats any non-standard port as dev', () => {
    expect(isDevLocation('example.com', '5173')).toBe(true);
    expect(isDevLocation('example.com', '8080')).toBe(true);
  });

  it('allows a plain production host', () => {
    expect(isDevLocation('bloodpixel.example.com', '')).toBe(false);
    expect(isDevLocation('fazleyrabby.github.io', '')).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(isDevLocation('LOCALHOST', '')).toBe(true);
  });
});

describe('isPreviewHost', () => {
  it('counts production Vercel hosts', () => {
    expect(isPreviewHost('blood-pixel.vercel.app')).toBe(false);
    expect(isPreviewHost('bloodpixel.com')).toBe(false);
    expect(isPreviewHost('fazleyrabby.github.io')).toBe(false);
  });

  it('ignores branch previews', () => {
    expect(isPreviewHost('blood-pixel-git-main-fazleyrabby.vercel.app')).toBe(true);
    expect(isPreviewHost('blood-pixel-git-feat-ui-fazleyrabby.vercel.app')).toBe(true);
  });

  it('ignores deployment-hash previews', () => {
    expect(isPreviewHost('blood-pixel-9f3a2b1c-fazleyrabby.vercel.app')).toBe(true);
  });
});

describe('isBotUserAgent', () => {
  it('flags webdriver sessions', () => {
    expect(isBotUserAgent('Mozilla/5.0', true)).toBe(true);
  });

  it('flags common crawlers and automation', () => {
    for (const ua of [
      'Googlebot/2.1',
      'HeadlessChrome/120',
      'Puppeteer',
      'Playwright',
      'curl/8.0',
      'Uptime-Monitor/1.0',
    ]) {
      expect(isBotUserAgent(ua, false)).toBe(true);
    }
  });

  it('allows a normal browser', () => {
    expect(
      isBotUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
        false,
      ),
    ).toBe(false);
  });
});
