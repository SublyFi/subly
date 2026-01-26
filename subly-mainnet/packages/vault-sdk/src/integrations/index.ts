/**
 * External Protocol Integrations
 *
 * This module provides integrations with external protocols:
 * - Privacy Cash: Private USDC deposits and withdrawals
 * - Tuk Tuk: Scheduled transfer automation (Clockwork replacement)
 * - Kamino: DeFi yield generation
 */

// Privacy Cash exports
export {
  PrivacyCashIntegration,
  createPrivacyCashIntegration,
  PrivacyCashError,
  USDC_MINT,
  PRIVACY_CASH_PROGRAM_ID,
} from './privacy-cash';
export type { PrivacyCashConfig, WithdrawResult } from './privacy-cash';

// Tuk Tuk exports
export {
  TukTukIntegration,
  createTukTukIntegration,
  TukTukError,
  TUKTUK_PROGRAM_ID,
  TUKTUK_CRON_PROGRAM_ID,
  intervalToCronSchedule,
} from './tuktuk';
export type { TukTukConfig, CronJobResult, PendingTransfer } from './tuktuk';

// Kamino exports (USDC_MINT excluded to avoid conflict with Privacy Cash)
export {
  KaminoIntegration,
  createKaminoIntegration,
  KaminoError,
  KAMINO_LENDING_PROGRAM_ID,
  KAMINO_MAIN_MARKET,
  // Note: USDC_MINT is the same as Privacy Cash, so we don't re-export
} from './kamino';
export type {
  KaminoConfig,
  KaminoYieldInfo,
  KaminoDepositResult,
  KaminoWithdrawResult,
} from './kamino';
