import { getRandomValues } from 'expo-crypto';

// Spec 023: a temporary password the Administrator hands to the Wholesaler.
// No look-alike characters (0/O, 1/l/I) so it can be dictated by phone.
const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

export function generateTemporaryPassword(length = 14): string {
  const bytes = getRandomValues(new Uint8Array(length * 2));
  let password = '';
  // Rejection sampling keeps every character equally likely.
  const limit = 256 - (256 % alphabet.length);
  for (const byte of bytes) {
    if (byte >= limit) continue;
    password += alphabet[byte % alphabet.length];
    if (password.length === length) return password;
  }
  return password + generateTemporaryPassword(length - password.length);
}

/** Groups of four to read aloud: «AbCd-EfGh-…». Only for display. */
export function groupForReading(password: string) {
  return password.match(/.{1,4}/g)?.join(' ') ?? password;
}
