// Admin/owner surface of the LegacyPrime plan — kept separate from the user ABI so the large entry
// count doesn't blow up wagmi's multicall type inference on the user hooks. Admin hooks/components pass
// this as viem's generic `Abi` (results are decoded by position), so the extra size costs no inference.
export const LEGACYPRIME_ADMIN_ABI = [
  // ---- reads (status panel + owner gate) ----
  { type: 'function', stateMutability: 'view', name: 'owner', inputs: [], outputs: [{ name: '', type: 'address' }] },
  { type: 'function', stateMutability: 'view', name: 'root', inputs: [], outputs: [{ name: '', type: 'address' }] },
  { type: 'function', stateMutability: 'view', name: 'checkIsAdmin', inputs: [{ name: 'addr', type: 'address' }], outputs: [{ name: '', type: 'bool' }] },
  { type: 'function', stateMutability: 'view', name: 'paused', inputs: [], outputs: [{ name: '', type: 'bool' }] },
  { type: 'function', stateMutability: 'view', name: 'treasury', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', stateMutability: 'view', name: 'lpntReserve', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', stateMutability: 'view', name: 'incentiveBalance', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', stateMutability: 'view', name: 'liquidityBalance', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', stateMutability: 'view', name: 'productBalance', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', stateMutability: 'view', name: 'profitBalance', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', stateMutability: 'view', name: 'collectedFees', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', stateMutability: 'view', name: 'systemFee', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', stateMutability: 'view', name: 'systemWallet', inputs: [], outputs: [{ name: '', type: 'address' }] },
  { type: 'function', stateMutability: 'view', name: 'withdrawFeeBps', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', stateMutability: 'view', name: 'minWithdraw', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', stateMutability: 'view', name: 'withdrawCooldown', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', stateMutability: 'view', name: 'cashBackClaimBps', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', stateMutability: 'view', name: 'capBps', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', stateMutability: 'view', name: 'productRate', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', stateMutability: 'view', name: 'liquidity', inputs: [], outputs: [{ name: '', type: 'address' }] },
  { type: 'function', stateMutability: 'view', name: 'liquiditySlippageBps', inputs: [], outputs: [{ name: '', type: 'uint256' }] },

  // ---- writes ----
  { type: 'function', stateMutability: 'nonpayable', name: 'setSystemFee', inputs: [{ name: '_systemFee', type: 'uint256' }, { name: '_systemWallet', type: 'address' }], outputs: [] },
  { type: 'function', stateMutability: 'nonpayable', name: 'setWithdrawParams', inputs: [{ name: '_feeBps', type: 'uint256' }, { name: '_cooldown', type: 'uint256' }, { name: '_minWithdraw', type: 'uint256' }], outputs: [] },
  { type: 'function', stateMutability: 'nonpayable', name: 'setProductRate', inputs: [{ name: '_rate', type: 'uint256' }], outputs: [] },
  { type: 'function', stateMutability: 'nonpayable', name: 'setCashBackClaimBps', inputs: [{ name: '_bps', type: 'uint256' }], outputs: [] },
  { type: 'function', stateMutability: 'nonpayable', name: 'setCapBps', inputs: [{ name: '_capBps', type: 'uint256' }], outputs: [] },
  { type: 'function', stateMutability: 'nonpayable', name: 'setPaused', inputs: [{ name: '_paused', type: 'bool' }], outputs: [] },
  { type: 'function', stateMutability: 'nonpayable', name: 'setLiquidity', inputs: [{ name: 'manager', type: 'address' }], outputs: [] },
  { type: 'function', stateMutability: 'nonpayable', name: 'setLiquiditySlippageBps', inputs: [{ name: 'bps', type: 'uint256' }], outputs: [] },
  { type: 'function', stateMutability: 'nonpayable', name: 'flushLiquidity', inputs: [{ name: 'amount', type: 'uint256' }], outputs: [] },
  { type: 'function', stateMutability: 'nonpayable', name: 'withdrawIncentive', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [] },
  { type: 'function', stateMutability: 'nonpayable', name: 'withdrawLiquidity', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [] },
  { type: 'function', stateMutability: 'nonpayable', name: 'withdrawProfit', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [] },
  { type: 'function', stateMutability: 'nonpayable', name: 'withdrawProduct', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [] },
  { type: 'function', stateMutability: 'nonpayable', name: 'withdrawFees', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [] },
  { type: 'function', stateMutability: 'nonpayable', name: 'withdrawTreasury', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [] },
  { type: 'function', stateMutability: 'nonpayable', name: 'withdrawLpnt', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [] },
  // owner-only
  { type: 'function', stateMutability: 'nonpayable', name: 'addAdmin', inputs: [{ name: 'adminAddress', type: 'address' }], outputs: [] },
  { type: 'function', stateMutability: 'nonpayable', name: 'removeAdmin', inputs: [{ name: 'adminAddress', type: 'address' }], outputs: [] },
  { type: 'function', stateMutability: 'nonpayable', name: 'transferOwnership', inputs: [{ name: 'newOwner', type: 'address' }], outputs: [] },
] as const
