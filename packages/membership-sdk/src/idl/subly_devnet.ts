/** Program ID for Subly Devnet */
export const PROGRAM_ID = "2iPghUjvt1JKPP6Sht6cR576DVmAjciGprNJQZhc5avA";

// Re-export the generated types
export type { SublyDevnet } from "./subly_devnet_generated";

// Import and re-export the IDL JSON
import idlJson from "./subly_devnet.json";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const IDL: any = idlJson;
