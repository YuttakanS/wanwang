import * as Crypto from 'expo-crypto';
import { bytesToHex } from '@/lib/adminKeyFormat';

/** The same shape the server makes: 16 random bytes as hex. Hermes has no crypto.getRandomValues of its own. */
export function newAdminKey(): string {
  return bytesToHex(Crypto.getRandomBytes(16));
}
