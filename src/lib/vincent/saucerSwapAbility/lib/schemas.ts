import { z } from 'zod';

export const KNOWN_ERRORS = {
  INSUFFICIENT_ALLOWANCE: 'INSUFFICIENT_ALLOWANCE',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  INVALID_PARAMS: 'INVALID_PARAMS',
} as const;

export const hex32 = z
  .string()
  .regex(/^0x[a-fA-F0-9]{64}$/i, 'Expected 0x-prefixed 32-byte hex');

export const hexBytes = z
  .string()
  .regex(/^0x[a-fA-F0-9]*$/i, 'Expected 0x-prefixed hex');

export const address = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/i, 'Invalid Ethereum address');

export const uintStr = z
  .string()
  .regex(/^\d+$/, 'Expected uint string');

export const intStr = z
  .string()
  .regex(/^-?\d+$/, 'Expected int string');

export const abilityParamsSchema = z.object({
  rpcUrl: z
    .string()
    .url('Invalid RPC URL format')
    .optional()
    .default('https://testnet.hashio.io/api'),

  executor: address,
  router: address,
  tokenIn: address,
  tokenOut: address,
  amountInWei: uintStr,
  minAmountOutWei: uintStr,
  recipient: address,

  priceUpdateData: z.array(hexBytes),
  priceId: hex32,
  maxAgeSec: z.number().int().nonnegative(),
  minPrice1e8: intStr,
  maxPrice1e8: intStr,
  feeWei: uintStr,
});

export const precheckSuccessSchema = z.object({
  balanceWei: z.string(),
  allowanceWei: z.string(),
  needsApproval: z.boolean(),
});

export const precheckFailSchema = z.object({
  reason: z.union([
    z.literal(KNOWN_ERRORS['INSUFFICIENT_ALLOWANCE']),
    z.literal(KNOWN_ERRORS['INSUFFICIENT_BALANCE']),
    z.literal(KNOWN_ERRORS['INVALID_PARAMS']),
  ]),
  error: z.string(),
});

export const executeSuccessSchema = z.object({
  txHash: z.string(),
  timestamp: z.number(),
});

export const executeFailSchema = z.object({
  error: z.string(),
});

export type AbilityParams = z.infer<typeof abilityParamsSchema>;
export type PrecheckSuccess = z.infer<typeof precheckSuccessSchema>;
export type PrecheckFail = z.infer<typeof precheckFailSchema>;
export type ExecuteSuccess = z.infer<typeof executeSuccessSchema>;
export type ExecuteFail = z.infer<typeof executeFailSchema>;
