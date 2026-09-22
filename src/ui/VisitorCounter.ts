/**
 * VisitorCounter.ts
 * Total-visit counter backed by the homelab "view-counter" service.
 *
 * Self-hosted (PM2 + SQLite on the VPS), publicly served through the
 * Cloudflare tunnel at https://views.fazleyrabbi.xyz. The service dedupes by
 * hashed IP (10 min window) and ignores private/local IPs, so we only add
 * light client-side guards (dev + bots + per-session) on top.
 *
 * API: GET /api/hit?project=&key=  (increment) and /api/get?project=&key=.
 *
 * Phase 5 — Ship Prep
 */

const VIEWS_BASE = 'https://views.fazleyrabbi.xyz';
const PROJECT = 'bloodpixel';
const KEY = 'visitors';
const CACHE_KEY = 'bloodpixel:visits';
const SESSION_KEY = 'bloodpixel:visitTracked';
const REQUEST_TIMEOUT_MS = 4000;

/** Local/dev hosts must never inflate the public counter. */
export function isDevLocation(hostname: string, port: string): boolean {
  const h = hostname.toLowerCase();
  return (
    h === 'localhost' ||
    h === '127.0.0.1' ||
    h === '::1' ||
    h.endsWith('.local') ||
    port !== ''
  );
}

const BOT_MARKERS = [
  'bot', 'spider', 'crawler', 'preview', 'lighthouse', 'headless',
  'phantomjs', 'selenium', 'puppeteer', 'playwright', 'curl', 'wget',
  'monitor', 'uptime', 'scrap',
];

/**
 * Vercel preview deployments must not inflate the public count:
 *   production → blood-pixel.vercel.app / custom domain
 *   preview    → blood-pixel-git-main-user.vercel.app
 *                blood-pixel-9f3a2b1c-user.vercel.app
 */
export function isPreviewHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h.includes('-git-')) return true;
  if (h.endsWith('.vercel.app')) return /-[0-9a-z]{8,}-/.test(h);
  return false;
}

/** Automated traffic (incl. our own Playwright verification runs) is ignored. */
export function isBotUserAgent(userAgent: string, webdriver: boolean): boolean {
  if (webdriver) return true;
  const ua = userAgent.toLowerCase();
  return BOT_MARKERS.some((p) => ua.includes(p));
}

function readCache(): number {
  try {
    return parseInt(localStorage.getItem(CACHE_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function writeCache(value: number): void {
  try {
    localStorage.setItem(CACHE_KEY, String(value));
  } catch {
    /* storage unavailable */
  }
}

function animateCount(el: HTMLElement, start: number, end: number, duration = 900): void {
  if (start === end) {
    el.textContent = end.toLocaleString();
    return;
  }
  const t0 = performance.now();
  const tick = (now: number): void => {
    const p = Math.min((now - t0) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(start + (end - start) * eased).toLocaleString();
    if (p < 1) requestAnimationFrame(tick);
    else el.textContent = end.toLocaleString();
  };
  requestAnimationFrame(tick);
}

function buildWidget(count: number): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'visitor-counter';
  wrap.id = 'visitor-counter';
  wrap.title = 'Total site visits — live';
  wrap.innerHTML = `
    <span class="visitor-counter__pulse" aria-hidden="true">
      <span class="visitor-counter__ping"></span>
      <span class="visitor-counter__core"></span>
    </span>
    <span class="visitor-counter__label">Visits</span>
    <span class="visitor-counter__count" id="visitor-count-number" aria-live="polite">${count.toLocaleString()}</span>
  `;
  return wrap;
}

export async function initVisitorCounter(): Promise<void> {
  const mount = document.getElementById('visitor-counter-mount');
  if (!mount || mount.dataset.loaded === 'true') return;
  mount.dataset.loaded = 'true';

  const cached = readCache();
  const widget = buildWidget(cached);
  mount.appendChild(widget);
  const countEl = document.getElementById('visitor-count-number');

  const alreadyTracked = (() => {
    try {
      return sessionStorage.getItem(SESSION_KEY) === 'true';
    } catch {
      return false;
    }
  })();

  const dev = isDevLocation(window.location.hostname, window.location.port);
  const preview = isPreviewHost(window.location.hostname);
  const bot = isBotUserAgent(navigator.userAgent, navigator.webdriver === true);
  const shouldTrack = !dev && !preview && !bot && !alreadyTracked;
  const endpoint = shouldTrack
    ? `${VIEWS_BASE}/api/hit?project=${PROJECT}&key=${KEY}`
    : `${VIEWS_BASE}/api/get?project=${PROJECT}&key=${KEY}`;
  if (shouldTrack) {
    try {
      sessionStorage.setItem(SESSION_KEY, 'true');
    } catch {
      /* storage unavailable */
    }
  }

  let current = cached;
  try {
    const res = await fetch(endpoint, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    if (res.ok) {
      const data = (await res.json()) as { views?: number };
      if (typeof data.views === 'number') current = data.views;
    }
  } catch {
    /* offline / API down — keep the cached value */
  }

  writeCache(current);
  if (countEl) animateCount(countEl, cached, current);
}
