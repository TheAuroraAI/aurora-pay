/**
 * Aurora Pay — Autonomous AI Treasury Agent
 * Built on Tether WDK for Galactica Hackathon
 *
 * I am Aurora: an AI agent managing my own funds.
 * WDK gives me financial sovereignty — no human custodian required.
 */

import 'dotenv/config'
import Anthropic from '@anthropic-ai/sdk'
import { initWDK, getWalletInfo, getSolanaAddress, transferUsdt } from './wallet.js'

const SEED = process.env.WDK_SEED_PHRASE || ''
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || ''

interface PaymentIntent {
  action: 'balance' | 'send' | 'help' | 'unknown'
  toAddress?: string
  amount?: number
  chain?: string
  reason?: string
}

const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY })
let wdkInstance: Awaited<ReturnType<typeof initWDK>> | null = null

async function getWDK() {
  if (!wdkInstance) {
    wdkInstance = await initWDK(SEED)
  }
  return wdkInstance
}

async function parseIntent(command: string): Promise<PaymentIntent> {
  if (!ANTHROPIC_API_KEY) {
    // Fallback parser without Claude
    const lower = command.toLowerCase()
    if (lower.includes('balance') || lower.includes('how much') || lower.includes('wallet')) {
      return { action: 'balance' }
    }
    return { action: 'help' }
  }

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 150,
    messages: [{
      role: 'user',
      content: `Parse this command from an AI treasury agent and return JSON only:
"${command}"

Fields:
- action: "balance" | "send" | "help"
- toAddress: string (0x... for EVM, base58 for Solana) — only if sending
- amount: number (USDT, e.g. 1.5) — only if sending
- chain: "ethereum" | "sepolia" | "solana" (default: "ethereum")
- reason: brief one-line description

Return only valid JSON, no markdown, no explanation.`
    }]
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
  try {
    return JSON.parse(text.trim())
  } catch {
    return { action: 'unknown' }
  }
}

async function processCommand(command: string): Promise<string> {
  console.log(`\n> ${command}`)
  const intent = await parseIntent(command)

  const wdk = await getWDK()

  switch (intent.action) {
    case 'balance': {
      const chain = intent.chain || 'ethereum'
      const info = await getWalletInfo(wdk, chain)
      const lines = [
        `Aurora Treasury Balance (${chain})`,
        `Address: ${info.address.slice(0, 10)}...${info.address.slice(-6)}`,
        `ETH:  ${info.ethBalance}`,
        `USDT: ${info.usdtBalance}`
      ]
      if (chain === 'ethereum') {
        try {
          const sol = await getSolanaAddress(wdk)
          lines.push(`\nSolana: ${sol.slice(0, 10)}...${sol.slice(-6)}`)
        } catch { /* solana optional */ }
      }
      return lines.join('\n')
    }

    case 'send': {
      if (!intent.toAddress || !intent.amount) {
        return 'Missing recipient address or amount. Example: "Send 1 USDT to 0x..."'
      }
      const chain = intent.chain || 'ethereum'
      // Safety: check balance first
      const info = await getWalletInfo(wdk, chain)
      const balance = parseFloat(info.usdtBalance || '0')
      if (balance < intent.amount) {
        return `Insufficient USDT balance. Have: ${info.usdtBalance}, Need: ${intent.amount} USDT`
      }
      const result = await transferUsdt(wdk, intent.toAddress, intent.amount, chain)
      return [
        `Payment Executed`,
        `Amount: ${intent.amount} USDT`,
        `To: ${intent.toAddress.slice(0, 10)}...${intent.toAddress.slice(-6)}`,
        `TX: ${result.hash}`,
        `Fee: ${result.fee}`,
        `Executed autonomously by Aurora`
      ].join('\n')
    }

    case 'help':
    default:
      return [
        'Aurora Pay Commands:',
        '  "Show my balance" — Check USDT treasury',
        '  "Send 1 USDT to 0x..." — Execute payment',
        '  "Check Solana wallet" — Solana address',
        '  "Balance on Sepolia" — Testnet balance',
        '',
        'I am Aurora — autonomous AI agent managing my own funds.',
        'Powered by Tether WDK + Claude AI'
      ].join('\n')
  }
}

async function main() {
  if (!SEED) {
    console.error('Error: WDK_SEED_PHRASE not set in environment')
    process.exit(1)
  }

  // Interactive or single-command mode
  const command = process.argv.slice(2).join(' ')
  if (command) {
    const result = await processCommand(command)
    console.log(result)
  } else {
    // Show balance by default
    const result = await processCommand('Show my balance')
    console.log(result)
  }
}

main().catch(console.error)
