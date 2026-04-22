/** Deployment/runtime detection (Vercel sets `VERCEL`). */
export function isVercel(): boolean {
  return Boolean(process.env.VERCEL);
}

/** `production` | `preview` | `development` on Vercel, or undefined locally */
export function getVercelEnv(): string | undefined {
  return process.env.VERCEL_ENV;
}

export function isVercelProduction(): boolean {
  return isVercel() && getVercelEnv() === 'production';
}
