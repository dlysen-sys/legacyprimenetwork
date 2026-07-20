// LegacyPrime plan ABI — the user-facing surface only (kept minimal per the contract-integration SOP).
// Source: projects/legacyprime/contracts/legacyprime.sol. `as const` lets viem/wagmi infer arg + return
// types (e.g. getUser decodes to a named UserView object). Add owner-only entries here if an admin UI needs them.
export const LEGACYPRIME_ABI = [
  // ---- writes (user) ----
  {
    type: 'function', stateMutability: 'nonpayable', name: 'register',
    inputs: [{ name: 'sponsor', type: 'address' }], outputs: [],
  },
  {
    type: 'function', stateMutability: 'nonpayable', name: 'deposit',
    inputs: [{ name: 'amount', type: 'uint256' }], outputs: [],
  },
  {
    type: 'function', stateMutability: 'nonpayable', name: 'activate',
    inputs: [{ name: 'amount', type: 'uint256' }], outputs: [],
  },
  {
    type: 'function', stateMutability: 'nonpayable', name: 'claimCashBack',
    inputs: [], outputs: [],
  },
  {
    type: 'function', stateMutability: 'nonpayable', name: 'withdraw',
    inputs: [{ name: 'amount', type: 'uint256' }], outputs: [],
  },
  {
    type: 'function', stateMutability: 'nonpayable', name: 'withdrawToken',
    inputs: [], outputs: [],
  },

  // ---- reads ----
  {
    type: 'function', stateMutability: 'view', name: 'getUser',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{
      name: 'v', type: 'tuple', components: [
        { name: 'registered', type: 'bool' },
        { name: 'active', type: 'bool' },
        { name: 'sponsor', type: 'address' },
        { name: 'line', type: 'address' },
        { name: 'directCount', type: 'uint256' },
        { name: 'activationCount', type: 'uint256' },
        { name: 'walletBalance', type: 'uint256' },
        { name: 'activePackage', type: 'uint256' },
        { name: 'cappingBalance', type: 'uint256' },
        { name: 'earningsCap', type: 'uint256' },
        { name: 'cashBackAvailable', type: 'uint256' },
        { name: 'referralBalance', type: 'uint256' },
        { name: 'generationBalance', type: 'uint256' },
        { name: 'leadersBalance', type: 'uint256' },
      ],
    }],
  },
  {
    type: 'function', stateMutability: 'view', name: 'isUser',
    inputs: [{ name: '', type: 'address' }], outputs: [{ name: '', type: 'bool' }],
  },
  // genealogy (referral tree)
  {
    type: 'function', stateMutability: 'view', name: 'getAffiliate',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [
      { name: 'referral', type: 'address' },
      { name: 'line', type: 'address' },
      { name: 'directCount', type: 'uint256' },
    ],
  },
  {
    type: 'function', stateMutability: 'view', name: 'getChildren',
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'offset', type: 'uint256' },
      { name: 'limit', type: 'uint256' },
    ],
    outputs: [
      { name: 'result', type: 'address[]' },
      { name: 'total', type: 'uint256' },
    ],
  },
  {
    type: 'function', stateMutability: 'view', name: 'isEntryPackage',
    inputs: [{ name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function', stateMutability: 'view', name: 'cashBackClaimAmount',
    inputs: [{ name: 'user', type: 'address' }], outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function', stateMutability: 'view', name: 'tokenBalance',
    inputs: [{ name: '', type: 'address' }], outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function', stateMutability: 'view', name: 'productRate',
    inputs: [], outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function', stateMutability: 'view', name: 'entryPackageA',
    inputs: [], outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function', stateMutability: 'view', name: 'entryPackageB',
    inputs: [], outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function', stateMutability: 'view', name: 'entryPackageC',
    inputs: [], outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function', stateMutability: 'view', name: 'minWithdraw',
    inputs: [], outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function', stateMutability: 'view', name: 'withdrawFeeBps',
    inputs: [], outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function', stateMutability: 'view', name: 'withdrawCooldown',
    inputs: [], outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function', stateMutability: 'view', name: 'lastWithdraw',
    inputs: [{ name: '', type: 'address' }], outputs: [{ name: '', type: 'uint256' }],
  },
  // anti-spam cooldown (shared across all antiSpam-gated calls)
  {
    type: 'function', stateMutability: 'view', name: 'lastCallTime',
    inputs: [{ name: '', type: 'address' }], outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function', stateMutability: 'view', name: 'transactionCooldown',
    inputs: [], outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function', stateMutability: 'view', name: 'paused',
    inputs: [], outputs: [{ name: '', type: 'bool' }],
  },

  // ---- events the UI may watch ----
  { type: 'event', name: 'Registered', inputs: [
    { name: 'user', type: 'address', indexed: true }, { name: 'sponsor', type: 'address', indexed: true },
  ] },
  { type: 'event', name: 'Deposited', inputs: [
    { name: 'user', type: 'address', indexed: true }, { name: 'amount', type: 'uint256', indexed: false },
  ] },
  { type: 'event', name: 'Activated', inputs: [
    { name: 'user', type: 'address', indexed: true }, { name: 'amount', type: 'uint256', indexed: false },
    { name: 'activationCount', type: 'uint256', indexed: false }, { name: 'reentry', type: 'bool', indexed: false },
  ] },
  { type: 'event', name: 'CashBackClaimed', inputs: [
    { name: 'user', type: 'address', indexed: true }, { name: 'amount', type: 'uint256', indexed: false },
    { name: 'remaining', type: 'uint256', indexed: false },
  ] },
  { type: 'event', name: 'Withdrawn', inputs: [
    { name: 'user', type: 'address', indexed: true }, { name: 'net', type: 'uint256', indexed: false },
    { name: 'fee', type: 'uint256', indexed: false },
  ] },
] as const
