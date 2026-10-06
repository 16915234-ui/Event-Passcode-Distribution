import * as OTPAuth from 'otpauth';

// 5-second TOTP step as defined in project specifications
export const TOTP_STEP_SECONDS = 5;

/**
 * Generate a cryptographically random Base32 secret for TOTP
 */
export function generateTotpSecret(): string {
  const secret = new OTPAuth.Secret({ size: 20 });
  return secret.base32;
}

/**
 * Create a TOTP instance with 5-second period and 6-digit output
 */
export function getTotpInstance(secretBase32: string): OTPAuth.TOTP {
  return new OTPAuth.TOTP({
    issuer: 'EventPass',
    label: 'HybridCheckIn',
    algorithm: 'SHA1',
    digits: 6,
    period: TOTP_STEP_SECONDS,
    secret: OTPAuth.Secret.fromBase32(secretBase32),
  });
}

/**
 * Generate current TOTP 6-digit code for an event
 */
export function generateTotpToken(secretBase32: string, timestamp?: number): string {
  const totp = getTotpInstance(secretBase32);
  return totp.generate({ timestamp: timestamp ?? Date.now() });
}

/**
 * Validate TOTP token with Grace Period:
 * Accepts the current time step (delta = 0) and previous step (delta = -1).
 * Window: 1 allows +/- 1 interval (5-10 seconds grace period).
 */
export function validateTotpToken(
  secretBase32: string,
  token: string
): { isValid: boolean; delta: number | null } {
  try {
    const cleanToken = token.trim();
    if (!cleanToken || cleanToken.length !== 6) {
      return { isValid: false, delta: null };
    }

    const totp = getTotpInstance(secretBase32);
    // window: 1 checks current step, -1 step, and +1 step (slight clock skew)
    const delta = totp.validate({
      token: cleanToken,
      window: 1,
    });

    // delta === null means invalid/expired token.
    // delta === 0 is exact current period.
    // delta === -1 is previous period (acceptable within grace period).
    // delta === 1 is slightly early (clock forward).
    const isValid = delta !== null && delta >= -1 && delta <= 1;

    return { isValid, delta };
  } catch (err) {
    console.error('Error validating TOTP token:', err);
    return { isValid: false, delta: null };
  }
}

/**
 * Calculate remaining seconds and progress percentage (0 - 100)
 * in the current 5-second cycle for animated tickers.
 */
export function getTotpCycleInfo(): {
  remainingSeconds: number;
  remainingMs: number;
  progressPercent: number;
} {
  const now = Date.now();
  const periodMs = TOTP_STEP_SECONDS * 1000;
  const elapsedInPeriod = now % periodMs;
  const remainingMs = periodMs - elapsedInPeriod;
  const remainingSeconds = Math.ceil(remainingMs / 1000);
  const progressPercent = Math.max(0, Math.min(100, (remainingMs / periodMs) * 100));

  return {
    remainingSeconds,
    remainingMs,
    progressPercent,
  };
}
