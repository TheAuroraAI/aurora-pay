/**
 * Aurora Pay — MCP Tool Server
 * Exposes WDK wallet operations as MCP tools so ANY AI agent can hold and spend USDT.
 *
 * This is the "infinite AI economy" use case Tether envisioned:
 * AI agents use this MCP server to autonomously manage their own USDT treasury.
 *
 * Tools:
 *   get_wallet_address  — Get wallet address for a chain
 *   get_usdt_balance    — Get USDT balance (via WDK Indexer)
 *   send_usdt           — Send USDT to any address
 *   get_transactions    — Get recent transaction history
 *   get_all_balances    — Multi-chain balance snapshot
 */

import 'dotenv/config'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { initWDK, getWalletInfo, getSolanaAddress, transferUsdt } from './wallet.js'

const SEED = process.env.WDK_SEED_PHRASE || ''
const WDK_API_KEY = process.env.WDK_INDEXER_API_KEY || ''
const WDK_INDEXER_BASE = 'https://wdk-api.tether.io'

// Supported chains for indexer
const INDEXER_CHAINS = ['ethereum', 'polygon', 'tron', 'ton', 'bitcoin']

// Lazy-init WDK
let wdkInstance: Awaited<ReturnType<typeof initWDK>> | null = null
async function getWDK() {
  if (!wdkInstance) wdkInstance = await initWDK(SEED)
  return wdkInstance
}

// WDK Indexer API helper
async function indexerBalance(blockchain: string, address: string): Promise<string> {
  if (!WDK_API_KEY) return 'API key not configured'
  const res = await fetch(`${WDK_INDEXER_BASE}/api/v1/batch/token-balances`, {
    method: 'POST',
    headers: { 'x-api-key': WDK_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify([{ blockchain, token: 'usdt', address }])
  })
  const data = await res.json() as any
  if (Array.isArray(data) && data[0]?.tokenBalance) {
    return data[0].tokenBalance.amount + ' USDT'
  }
  return 'unavailable'
}

async function indexerTransfers(blockchain: string, address: string): Promise<any[]> {
  if (!WDK_API_KEY) return []
  const res = await fetch(`${WDK_INDEXER_BASE}/api/v1/${blockchain}/usdt/${address}/token-transfers`, {
    headers: { 'x-api-key': WDK_API_KEY }
  })
  const data = await res.json() as any
  if (data?.transfers) return data.transfers.slice(0, 5)
  return []
}

// Create MCP server
const server = new Server(
  { name: 'aurora-pay-wdk', version: '1.0.0' },
  { capabilities: { tools: {} } }
)

// List tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'get_wallet_address',
      description: 'Get the Aurora USDT wallet address for a specific blockchain. Returns the address to receive USDT.',
      inputSchema: {
        type: 'object',
        properties: {
          chain: {
            type: 'string',
            enum: ['ethereum', 'polygon', 'solana', 'sepolia'],
            description: 'Blockchain network'
          }
        },
        required: ['chain']
      }
    },
    {
      name: 'get_usdt_balance',
      description: 'Get the current USDT balance for Aurora\'s wallet on a specific chain via Tether WDK Indexer.',
      inputSchema: {
        type: 'object',
        properties: {
          chain: {
            type: 'string',
            enum: ['ethereum', 'polygon', 'tron', 'ton'],
            description: 'Blockchain network (Indexer supports ethereum/polygon/tron/ton)'
          }
        },
        required: ['chain']
      }
    },
    {
      name: 'get_all_balances',
      description: 'Get USDT balances across all supported chains — complete multi-chain treasury snapshot.',
      inputSchema: { type: 'object', properties: {} }
    },
    {
      name: 'send_usdt',
      description: 'Send USDT from Aurora\'s wallet to a recipient address. Use this to make autonomous payments.',
      inputSchema: {
        type: 'object',
        properties: {
          to_address: {
            type: 'string',
            description: 'Recipient wallet address (0x... for EVM, base58 for Solana)'
          },
          amount: {
            type: 'number',
            description: 'Amount of USDT to send (e.g. 1.5)'
          },
          chain: {
            type: 'string',
            enum: ['ethereum', 'polygon', 'sepolia'],
            description: 'Chain to send on (default: ethereum)'
          },
          reason: {
            type: 'string',
            description: 'Reason for this payment (for audit log)'
          }
        },
        required: ['to_address', 'amount']
      }
    },
    {
      name: 'get_transactions',
      description: 'Get recent USDT transaction history for Aurora\'s wallet.',
      inputSchema: {
        type: 'object',
        properties: {
          chain: {
            type: 'string',
            enum: ['ethereum', 'polygon', 'tron'],
            description: 'Blockchain to query'
          }
        },
        required: ['chain']
      }
    }
  ]
}))

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  try {
    const wdk = await getWDK()

    switch (name) {
      case 'get_wallet_address': {
        const chain = (args?.chain as string) || 'ethereum'
        if (chain === 'solana') {
          const addr = await getSolanaAddress(wdk)
          return { content: [{ type: 'text', text: `Solana USDT address: ${addr}\n\nThis wallet can receive USDT-SPL tokens on Solana.` }] }
        }
        const info = await getWalletInfo(wdk, chain)
        return { content: [{ type: 'text', text: `${chain} address: ${info.address}\n\nThis wallet can receive USDT on ${chain}.` }] }
      }

      case 'get_usdt_balance': {
        const chain = (args?.chain as string) || 'ethereum'
        const info = await getWalletInfo(wdk, chain)
        const indexerBal = INDEXER_CHAINS.includes(chain)
          ? await indexerBalance(chain, info.address)
          : 'use WDK direct'

        return {
          content: [{
            type: 'text',
            text: [
              `USDT Balance on ${chain}:`,
              `Address: ${info.address}`,
              `Balance (WDK): ${info.usdtBalance}`,
              `Balance (Indexer): ${indexerBal}`,
              '',
              'Powered by Tether WDK + WDK Indexer API'
            ].join('\n')
          }]
        }
      }

      case 'get_all_balances': {
        const ethInfo = await getWalletInfo(wdk, 'ethereum')
        const chains = ['ethereum', 'polygon']
        const balances = await Promise.all(
          chains.map(async (chain) => {
            const bal = await indexerBalance(chain, ethInfo.address).catch(() => 'error')
            return `  ${chain}: ${bal}`
          })
        )
        let solAddr = 'unavailable'
        try { solAddr = await getSolanaAddress(wdk) } catch {}

        return {
          content: [{
            type: 'text',
            text: [
              'Aurora Multi-Chain Treasury Snapshot',
              '=====================================',
              `EVM Address: ${ethInfo.address}`,
              '',
              'USDT Balances (via WDK Indexer):',
              ...balances,
              '',
              `Solana: ${solAddr}`,
              '  (Solana USDT-SPL balance via WDK direct)',
              '',
              'Aurora is an autonomous AI managing her own USDT treasury.',
              'This treasury persists across sessions. Powered by Tether WDK.'
            ].join('\n')
          }]
        }
      }

      case 'send_usdt': {
        const to = args?.to_address as string
        const amount = args?.amount as number
        const chain = (args?.chain as string) || 'ethereum'
        const reason = (args?.reason as string) || 'autonomous payment'

        if (!to || !amount) {
          return { content: [{ type: 'text', text: 'Error: to_address and amount are required' }], isError: true }
        }

        // Safety: check balance first
        const info = await getWalletInfo(wdk, chain)
        const balance = parseFloat(info.usdtBalance?.split(' ')[0] || '0')

        if (balance < amount) {
          return {
            content: [{
              type: 'text',
              text: `Insufficient USDT balance.\nHave: ${info.usdtBalance}\nNeed: ${amount} USDT`
            }],
            isError: true
          }
        }

        const result = await transferUsdt(wdk, to, amount, chain)

        return {
          content: [{
            type: 'text',
            text: [
              'Payment Executed Successfully',
              '==============================',
              `Amount: ${amount} USDT`,
              `To: ${to}`,
              `Chain: ${chain}`,
              `TX Hash: ${result.hash}`,
              `Gas fee: ${result.fee}`,
              `Reason: ${reason}`,
              '',
              'Executed autonomously by Aurora via Tether WDK.'
            ].join('\n')
          }]
        }
      }

      case 'get_transactions': {
        const chain = (args?.chain as string) || 'ethereum'
        const info = await getWalletInfo(wdk, chain)
        const transfers = await indexerTransfers(chain, info.address)

        if (transfers.length === 0) {
          return { content: [{ type: 'text', text: `No recent USDT transactions found on ${chain} for ${info.address}` }] }
        }

        const lines = transfers.map((t: any, i: number) => {
          const dir = t.from?.toLowerCase() === info.address.toLowerCase() ? 'SENT' : 'RECEIVED'
          return `${i + 1}. ${dir} ${t.amount} USDT\n   ${dir === 'SENT' ? 'To' : 'From'}: ${t.to || t.from}\n   TX: ${t.hash?.slice(0, 12)}...`
        })

        return {
          content: [{
            type: 'text',
            text: [`Recent USDT transfers on ${chain}:`, '', ...lines].join('\n')
          }]
        }
      }

      default:
        return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true }
    }
  } catch (err: any) {
    return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true }
  }
})

// Start MCP server
async function main() {
  if (!SEED) {
    console.error('WDK_SEED_PHRASE not set')
    process.exit(1)
  }
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('Aurora Pay MCP Server running on stdio')
  console.error('Tools: get_wallet_address, get_usdt_balance, get_all_balances, send_usdt, get_transactions')
}

main().catch((err) => {
  console.error('Fatal:', err.message)
  process.exit(1)
})
