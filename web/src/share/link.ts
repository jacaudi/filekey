/** Single source of the Share-Key / deep-link contract (design D2, §14). */
export const RAW_KEY_RE = /^04[0-9a-fA-F]{264}$/;

/** The primary share artifact: the ?pub= deep link (D2). */
export function shareLink(pubHex: string): string {
  return `${location.origin}/?pub=${pubHex}`;
}

/** `04a1…9f2e` — first 4 + last 4 hex chars. */
export function truncateKey(pubHex: string): string {
  return `${pubHex.slice(0, 4)}…${pubHex.slice(-4)}`;
}

/**
 * Accepts a raw 266-hex Share Key or any URL whose query contains a valid
 * ?pub=. Returns normalized lowercase hex, or null if the input is neither.
 */
export function parseShareInput(input: string): string | null {
  const trimmed = input.trim();
  if (RAW_KEY_RE.test(trimmed)) return trimmed.toLowerCase();
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  const pub = url.searchParams.get('pub');
  if (pub !== null && RAW_KEY_RE.test(pub)) return pub.toLowerCase();
  return null;
}
