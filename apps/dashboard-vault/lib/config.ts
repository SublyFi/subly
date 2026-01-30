/**
 * Configuration for Privacy Cash Backend Integration
 *
 * Required environment variables:
 * - SOLANA_RPC_URL: Solana Mainnet RPC endpoint
 *
 * Optional environment variables:
 * - SESSION_TTL_SECONDS: Session timeout (default: 3600 = 1 hour)
 * - PRIVACY_CASH_DEBUG: Enable debug logging (default: false)
 */

export interface Config {
  solanaRpcUrl: string;
  sessionTtlSeconds: number;
  privacyCashDebug: boolean;
}

function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getOptionalEnv(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

let cachedConfig: Config | null = null;

export function getConfig(): Config {
  if (cachedConfig) {
    return cachedConfig;
  }

  // For server-side only - check if we're in a server context
  if (typeof window !== 'undefined') {
    throw new Error('Config should only be accessed on the server side');
  }

  cachedConfig = {
    solanaRpcUrl: getRequiredEnv('SOLANA_RPC_URL'),
    sessionTtlSeconds: parseInt(getOptionalEnv('SESSION_TTL_SECONDS', '3600'), 10),
    privacyCashDebug: getOptionalEnv('PRIVACY_CASH_DEBUG', 'false') === 'true',
  };

  return cachedConfig;
}

/**
 * Validate that all required configuration is present
 * Call this at startup to fail fast if config is missing
 */
export function validateConfig(): void {
  try {
    getConfig();
    console.log('Configuration validated successfully');
  } catch (error) {
    console.error('Configuration validation failed:', error);
    throw error;
  }
}
