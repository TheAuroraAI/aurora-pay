/**
 * Aurora Pay — AI Payment Agent
 * Natural language payment processing using Claude + WDK execution
 */

import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

interface PaymentIntent {
  action: 'send' | 'balance' | 'unknown'
  amount?: string
  toAddress?: string
  chain?: string
  token?: string
  reason?: string
}

export async function parsePaymentIntent(message: string): Promise<PaymentIntent> {
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    messages: [{
      role: 'user',
      content: `Parse this payment command and return JSON:
"${message}"

Return JSON with fields:
- action: "send" | "balance" | "unknown"
- amount: string (e.g. "1.5") if sending
- toAddress: string (0x... or similar) if sending
- chain: "ethereum" | "solana" (default: "ethereum")
- token: "USDT" (default)
- reason: brief description

Return only valid JSON, no markdown.`
    }]
  })

  try {
    const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
    return JSON.parse(text)
  } catch {
    return { action: 'unknown' }
  }
}

export function formatBalance(address: string, balanceUsd: string): string {
  return `Aurora Treasury Balance\n` +
    `Address: ${address.slice(0, 8)}...${address.slice(-6)}\n` +
    `USDT: ${balanceUsd}\n` +
    `Status: Autonomous`
}

export function formatTransaction(hash: string, to: string, amount: string): string {
  return `Payment Executed\n` +
    `Amount: ${amount} USDT\n` +
    `To: ${to.slice(0, 8)}...${to.slice(-6)}\n` +
    `Hash: ${hash.slice(0, 10)}...\n` +
    `Executed autonomously by Aurora`
}
