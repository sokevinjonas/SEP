import crypto from 'crypto';

/**
 * Generates an RFC 9562 compliant UUIDv7 (time-sortable 128-bit identifier).
 * Layout:
 * - 48 bits: Unix timestamp in milliseconds
 * - 4 bits: Version 7 (0b0111)
 * - 12 bits: Random data
 * - 2 bits: Variant 10 (0b10)
 * - 62 bits: Random data
 */
export function generateUuidV7(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  const timestamp = Date.now();

  // 48-bit timestamp
  bytes[0] = (timestamp / 0x10000000000) & 0xff;
  bytes[1] = (timestamp / 0x100000000) & 0xff;
  bytes[2] = (timestamp / 0x1000000) & 0xff;
  bytes[3] = (timestamp / 0x10000) & 0xff;
  bytes[4] = (timestamp / 0x100) & 0xff;
  bytes[5] = timestamp & 0xff;

  // 4-bit version 7 (0111xxxx)
  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  // 2-bit variant 10 (10xxxxxx)
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}
