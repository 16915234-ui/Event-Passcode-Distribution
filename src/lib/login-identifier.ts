import { accountEmail, USERNAME } from './validation';

export function normalizeLoginIdentifier(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const identifier = value.trim().toLowerCase();
  if (identifier.length > 254) return null;
  if (USERNAME.test(identifier) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) return identifier;
  return null;
}

// A username may belong to either an imported account or a manually created Auth account.
// Resolve using the trusted profile -> Auth UID mapping, never email-domain role inference.
export async function resolveLoginEmail(
  identifier: string,
  findEmailByUsername: (username: string) => Promise<string | null>,
): Promise<string> {
  if (identifier.includes('@')) return identifier;
  return (await findEmailByUsername(identifier)) || accountEmail(identifier);
}
