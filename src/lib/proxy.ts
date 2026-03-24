export const PROXY_URL = process.env.PROXY_URL || 'https://script.google.com/macros/s/AKfycbz1mplSmQAlfAD_zDr8Vu2Kst4aOLmKw98XwAboa4dajE8wKD6YQ-Zs5cBfjGRq-ce0/exec';

const CF_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

/** Browser-like headers that help bypass Cloudflare bot checks */
const CF_HEADERS: Record<string, string> = {
  'User-Agent': CF_UA,
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
  'Upgrade-Insecure-Requests': '1',
};

/**
 * Fetches targetUrl directly from Vercel's edge with browser-spoof headers.
 * Falls back to the Apps Script proxy only if PROXY_URL env var is explicitly set.
 */
export async function fetchDirect(
  targetUrl: string,
  options?: { isHtml?: boolean; revalidate?: number }
): Promise<Response> {
  const isHtml = options?.isHtml ?? false;
  const revalidate = options?.revalidate ?? 3600;

  const headers: Record<string, string> = {
    ...CF_HEADERS,
    'Accept': isHtml
      ? 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
      : 'application/json, text/plain, */*',
    'Referer': 'https://comix.to/',
  };

  // If a custom PROXY_URL is set (user provided their own bypass proxy), use it
  if (process.env.PROXY_URL) {
    const proxyUrl = `${process.env.PROXY_URL}?url=${encodeURIComponent(targetUrl)}`;
    return fetch(proxyUrl, { next: { revalidate } });
  }

  // Direct fetch from Vercel's edge
  return fetch(targetUrl, {
    headers,
    next: { revalidate },
  });
}

/** Legacy helper — kept for compatibility, use fetchDirect instead */
export function getProxyUrl(targetUrl: string) {
  return `${PROXY_URL}?url=${encodeURIComponent(targetUrl)}&ua=${encodeURIComponent(CF_UA)}`;
}

/** Returns true if the response is a Cloudflare challenge page */
export function isCloudflareChallenge(text: string): boolean {
  return (text.includes('Just a moment') && text.includes('Cloudflare')) ||
    text.includes('cf-browser-verification') ||
    text.includes('_cf_chl_');
}

