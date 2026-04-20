/**
 * Central env mapping for Nest. Loaded by {@link ConfigModule} (global).
 * Database: on Vercel use cloud `DATABASE_URL`; locally prefer `DATABASE_URL_LOCAL` then `DATABASE_URL`.
 */
function resolveDatabaseUrl(): string {
  const onVercel = Boolean(process.env.VERCEL);
  const url = onVercel
    ? process.env.DATABASE_URL
    : (process.env.DATABASE_URL_LOCAL ?? process.env.DATABASE_URL);

  if (!url?.trim()) {
    throw new Error(
      'Database URL is not configured. Set DATABASE_URL (required on Vercel and default locally), or DATABASE_URL_LOCAL for a separate local database.',
    );
  }
  return url.trim();
}

export default () => ({
  isVercel: Boolean(process.env.VERCEL),
  databaseUrl: resolveDatabaseUrl(),
  jwt: {
    secret: process.env.JWT_SECRET ?? 'k-bix-pop-super-secret',
  },
});
