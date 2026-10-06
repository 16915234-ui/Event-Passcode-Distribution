import { createHmac, timingSafeEqual } from 'node:crypto';
import { UUID } from './validation';
function signature(value: string) {
  const key = process.env.QR_SIGNING_SECRET;
  if (!key || key.length < 32) throw new Error('QR_SIGNING_SECRET must contain at least 32 characters');
  return createHmac('sha256', key).update(value).digest('base64url');
}
export function studentQr(eventId: string, studentId: string) {
  const value = `ARU1.${eventId}.${studentId}`;
  return `${value}.${signature(value)}`;
}
export function verifyStudentQr(qr: string, eventId: string): string | null {
  const parts = qr.split('.');
  if (parts.length !== 4 || parts[0] !== 'ARU1' || parts[1] !== eventId || !UUID.test(parts[1]) || !UUID.test(parts[2])) return null;
  const expected = Buffer.from(signature(parts.slice(0, 3).join('.')));
  const actual = Buffer.from(parts[3]);
  return expected.length === actual.length && timingSafeEqual(expected, actual) ? parts[2] : null;
}
