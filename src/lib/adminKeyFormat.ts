// Shared by the website, the server and the app, so it must not import anything.

/** The shape of every admin key: 16 random bytes as lowercase hex. */
export const ADMIN_KEY_PATTERN = /^[0-9a-f]{32}$/;

export function isAdminKeyFormat(value: unknown): value is string {
  return typeof value === 'string' && ADMIN_KEY_PATTERN.test(value);
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}
