export const PROXY_URL = process.env.PROXY_URL || 'https://script.google.com/macros/s/AKfycbzCj90nEGFsgSXv_tS4HD9KDh-A4S6P1kF2G8NqapQSR6oQ6ATiot7Wxt7sLiFKfjJh/exec';

export function getProxyUrl(targetUrl: string) {
  return `${PROXY_URL}?url=${encodeURIComponent(targetUrl)}`;
}
