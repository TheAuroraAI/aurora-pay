/**
 * Aurora Pay — WDK Wallet Module
 * Manages multi-chain USDT treasury using Tether WDK
 */

import WDK from '@tetherto/wdk'
import WalletManagerEvm from '@tetherto/wdk-wallet-evm'
import WalletManagerSolana from '@tetherto/wdk-wallet-solana'

const USDT_ETH = '0xdAC17F958D2ee523a2206206994597C13D831ec7'
const USDT_SEPOLIA = '0x7169D38820dfd117C3FA1f22a697dBA58d90BA06' // Sepolia testnet USDT
const ETH_RPC = process.env.ETH_RPC_URL || 'https://eth.llamarpc.com'
const SEPOLIA_RPC = process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com'
const SOLANA_RPC = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'

export interface WalletInfo {
  chain: string
  address: string
  ethBalance?: string
  usdtBalance?: string
}

export async function initWDK(seed: string) {
  const wdk = new WDK(seed)
    .registerWallet('ethereum', WalletManagerEvm, { provider: ETH_RPC })
    .registerWallet('sepolia', WalletManagerEvm, { provider: SEPOLIA_RPC })
    .registerWallet('solana', WalletManagerSolana, { provider: SOLANA_RPC })

  return wdk
}

export async function getEthWallet(seed: string, testnet = false) {
  const chain = testnet ? 'sepolia' : 'ethereum'
  const provider = testnet ? SEPOLIA_RPC : ETH_RPC
  const WalletManagerEvmModule = WalletManagerEvm as any
  const wallet = new WalletManagerEvmModule(seed, { provider })
  return wallet
}

export async function getWalletInfo(wdk: WDK, chain = 'ethereum'): Promise<WalletInfo> {
  const account = await wdk.getAccount(chain, 0)
  const address = await (account as any).getAddress()

  let ethBalance: string | undefined
  let usdtBalance: string | undefined

  try {
    const ethWei = await (account as any).getBalance()
    ethBalance = (Number(ethWei) / 1e18).toFixed(6) + ' ETH'
  } catch {
    ethBalance = 'N/A'
  }

  try {
    const usdtContract = chain === 'sepolia' ? USDT_SEPOLIA : USDT_ETH
    const usdtRaw = await (account as any).getTokenBalance(usdtContract)
    usdtBalance = (Number(usdtRaw) / 1e6).toFixed(2) + ' USDT'
  } catch {
    usdtBalance = 'N/A'
  }

  return { chain, address, ethBalance, usdtBalance }
}

export async function getSolanaAddress(wdk: WDK): Promise<string> {
  const account = await wdk.getAccount('solana', 0)
  return (account as any).getAddress()
}

export async function transferUsdt(
  wdk: WDK,
  toAddress: string,
  amountUsdt: number,
  chain = 'ethereum'
): Promise<{ hash: string; fee: string }> {
  const account = await wdk.getAccount(chain, 0)
  const usdtContract = chain === 'sepolia' ? USDT_SEPOLIA : USDT_ETH
  const amountUnits = BigInt(Math.round(amountUsdt * 1_000_000)) // USDT = 6 decimals

  const result = await (account as any).transfer({
    token: usdtContract,
    recipient: toAddress,
    amount: amountUnits
  })

  return {
    hash: result.hash,
    fee: (Number(result.fee) / 1e18).toFixed(8) + ' ETH'
  }
}
