import {
  createVincentAbility,
  supportedPoliciesForAbility,
} from '@lit-protocol/vincent-ability-sdk';
import { laUtils } from '@lit-protocol/vincent-scaffold-sdk';

import type { EthersType } from '../Lit';
import {
  abilityParamsSchema,
  precheckSuccessSchema,
  precheckFailSchema,
  executeSuccessSchema,
  executeFailSchema,
  KNOWN_ERRORS,
} from './schemas';

declare const ethers: EthersType;

export const vincentAbility = createVincentAbility({
  packageName: '@proptrader/ability-saucer-swap' as const,
  abilityParamsSchema,
  abilityDescription: 'Execute a guarded SaucerSwap swap via StrategyExecutor with Pyth oracle updates',
  supportedPolicies: supportedPoliciesForAbility([]),

  precheckSuccessSchema,
  precheckFailSchema,
  executeSuccessSchema,
  executeFailSchema,

  precheck: async ({ abilityParams }, { succeed, fail, delegation }) => {
    try {
      const {
        rpcUrl,
        tokenIn,
        executor,
        amountInWei,
      } = abilityParams;

      const owner = delegation.delegatorPkpInfo.ethAddress;
      const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

      const erc20 = new ethers.Contract(
        tokenIn,
        [
          'function balanceOf(address) view returns (uint256)',
          'function allowance(address,address) view returns (uint256)',
        ],
        provider,
      );

      const [bal, allowance] = await Promise.all([
        erc20.balanceOf(owner),
        erc20.allowance(owner, executor),
      ]);

      const needsApproval = allowance.lt(ethers.BigNumber.from(amountInWei));
      if (bal.lt(ethers.BigNumber.from(amountInWei))) {
        return fail({
          reason: KNOWN_ERRORS.INSUFFICIENT_BALANCE,
          error: `Insufficient balance: ${bal.toString()} < ${amountInWei}`,
        });
      }

      return succeed({
        balanceWei: bal.toString(),
        allowanceWei: allowance.toString(),
        needsApproval,
      });
    } catch (e: any) {
      return fail({ reason: KNOWN_ERRORS.INVALID_PARAMS, error: e?.message || 'precheck error' });
    }
  },

  execute: async ({ abilityParams }, { succeed, fail, delegation }) => {
    try {
      const {
        rpcUrl,
        executor,
        router,
        tokenIn,
        tokenOut,
        amountInWei,
        minAmountOutWei,
        recipient,
        priceUpdateData,
        priceId,
        maxAgeSec,
        minPrice1e8,
        maxPrice1e8,
        feeWei,
      } = abilityParams;

      const owner = delegation.delegatorPkpInfo.ethAddress;
      const pkpPublicKey = delegation.delegatorPkpInfo.publicKey;

      const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

      // Ensure allowance
      const erc20Abi = [
        'function approve(address spender, uint256 value) returns (bool)',
        'function allowance(address owner, address spender) view returns (uint256)',
      ];

      const currentAllowance = await new ethers.Contract(tokenIn, erc20Abi, provider).allowance(owner, executor);
      if (ethers.BigNumber.from(currentAllowance).lt(ethers.BigNumber.from(amountInWei))) {
        await laUtils.transaction.handler.contractCall({
          provider,
          pkpPublicKey,
          callerAddress: owner,
          abi: [erc20Abi[0]],
          contractAddress: tokenIn,
          functionName: 'approve',
          args: [executor, amountInWei],
          overrides: { gasLimit: 150000 },
        });
      }

      const EXECUTOR_ABI = [
        'function executeSwapWithOracle(address router,address tokenIn,address tokenOut,uint256 amountIn,uint256 minAmountOut,address recipient,bytes[] priceUpdateData,bytes32 priceId,uint64 maxAgeSec,int64 minPrice,int64 maxPrice) payable returns (uint256)'
      ];

      const txHash = await laUtils.transaction.handler.contractCall({
        provider,
        pkpPublicKey,
        callerAddress: owner,
        abi: EXECUTOR_ABI,
        contractAddress: executor,
        functionName: 'executeSwapWithOracle',
        args: [
          router,
          tokenIn,
          tokenOut,
          amountInWei,
          minAmountOutWei,
          recipient,
          priceUpdateData,
          priceId,
          maxAgeSec,
          minPrice1e8,
          maxPrice1e8,
        ],
        overrides: {
          value: feeWei,
        },
      });

      return succeed({ txHash, timestamp: Date.now() });
    } catch (e: any) {
      return fail({ error: e?.message || 'execute error' });
    }
  },
});
