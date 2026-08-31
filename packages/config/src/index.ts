export const APP_NAME = 'Nabta';
export const API_PREFIX = '/api/v1';

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getEnv(name: string, fallback?: string): string {
  return process.env[name] ?? fallback ?? '';
}
