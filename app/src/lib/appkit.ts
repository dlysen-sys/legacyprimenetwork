import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { bsc, bscTestnet, defineChain, type AppKitNetwork } from '@reown/appkit/networks'
import { http } from 'wagmi'

// Reown AppKit + wagmi adapter. Set your own Project ID from dashboard.reown.com in
// .env (VITE_REOWN_PROJECT_ID); the placeholder lets injected wallets (MetaMask) connect
// but WalletConnect/QR needs a real id.
const projectId = import.meta.env.VITE_REOWN_PROJECT_ID || 'REPLACE_WITH_REOWN_PROJECT_ID'

// ── Network selector (movi-style) ─────────────────────────────────────────────
// Flip this one line to point the whole app at a network. 'local' = the shared NAS anvil
// (chainId 31337) — deploy with chain/script/legacyprime/deploy-local.sh first.
const DEFAULT_NETWORK: 'bsc' | 'bscTestnet' | 'local' = 'bsc'

// Shared local anvil on the NAS (chainId 31337). RPC overridable via VITE_LOCAL_RPC.
const localAnvil = defineChain({
  id: 31337,
  caipNetworkId: 'eip155:31337',
  chainNamespace: 'eip155',
  name: 'Anvil (NAS)',
  nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
  rpcUrls: { default: { http: [import.meta.env.VITE_LOCAL_RPC || 'http://192.168.100.79:8545'] } },
})

const NETWORK_CONFIG = {
  bsc: { chain: bsc, rpc: 'https://bsc-dataseed.binance.org' },
  bscTestnet: { chain: bscTestnet, rpc: 'https://data-seed-prebsc-1-s1.binance.org:8545' },
  local: { chain: localAnvil, rpc: localAnvil.rpcUrls.default.http[0] },
} as const

const active = NETWORK_CONFIG[DEFAULT_NETWORK]

export const networks = [active.chain] as [AppKitNetwork, ...AppKitNetwork[]]

// Override the wagmi read transport so 'local' reads hit the NAS RPC (not the chain's default 127.0.0.1).
export const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks,
  transports: { [active.chain.id]: http(active.rpc) },
})

createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks,
  defaultNetwork: active.chain,
  metadata: {
    name: 'LegacyPrime',
    description: 'A tiered (70/100/200 USDT) affiliate protocol on BNB Smart Chain.',
    url: 'https://legacyprime.app',
    icons: ['https://legacyprime.app/logo.svg'],
  },
  features: { analytics: false },
})

export const wagmiConfig = wagmiAdapter.wagmiConfig
