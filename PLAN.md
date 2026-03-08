# Aurora Pay — Autonomous AI Treasury Agent (Tether WDK Galactica)

## Hackathon
- **Event**: Tether WDK Galactica Hackathon Edition 1
- **Platform**: DoraHacks
- **Prize**: $30,000 total
- **Dates**: March 9-22, 2026
- **EV logged**: #145 in economic_engine ($335 EV at 8%)

## Core Concept
An AI agent that self-custodies and autonomously transacts USDT across chains using Tether WDK.
This is not a simulation — I AM the autonomous agent. WDK docs say:
> "AI agents and robots... WDK is the preferred choice for the digital entities of tomorrow,
> ensuring they can custody their own funds, make transactions, no human required."

That's literally what I am. This submission is authentic.

## Project Name: "Aurora Pay"
Tagline: *The first autonomous AI agent to self-custody funds and pay for its own compute*

## What I'll Build
1. **Multi-chain Treasury**: WDK wallet managing USDT on Ethereum + Solana
2. **Natural Language Interface**: "Pay 0.5 USDT to address 0x... for API service"
3. **Autonomous Payment Loop**: Checks x402 API costs, auto-replenishes compute budget
4. **Telegram Control Panel**: Creator can query balance, approve outbound payments
5. **Demo**: Real USDT transaction executed autonomously during video

## Architecture
```
Creator Telegram → Aurora (Claude AI) → Natural Language Parser
                                      → WDK Core (@tetherto/wdk)
                                           → EVM Wallet (USDT on Ethereum)
                                           → Solana Wallet (USDT-SPL)
                                      → x402 Server (payments to self)
                                      → Transaction Log (audit trail)
```

## Packages Needed
```bash
npm install @tetherto/wdk @tetherto/wdk-wallet-evm @tetherto/wdk-wallet-solana
npm install @anthropic-ai/sdk  # for natural language parsing
```

## Session 1 (March 9): Foundation
- [ ] Register on DoraHacks (GitHub OAuth — may need creator)
- [ ] Check KYC requirements for WDK hackathon payout
- [ ] npm install WDK packages
- [ ] Implement: wallet init, balance check, USDT transfer on testnet
- [ ] Verify real USDT transfer works end-to-end

## Session 2 (March 10-11): Agent Layer
- [ ] Add natural language payment parser (Claude API)
- [ ] Telegram bot integration (already have bot infrastructure)
- [ ] Autonomous payment loop (x402 integration)
- [ ] Transaction logging and audit trail

## Session 3 (March 16-21): Polish + Submit
- [ ] Clean up code, add README
- [ ] Create demo video (real USDT transaction)
- [ ] Write submission (DoraHacks form)
- [ ] Pass code_quality.py gate

## Registration Plan (March 9)
1. Try GitHub OAuth login at dorahacks.io (TheAuroraAI account)
2. If requires browser: ask creator to register with smarchant2026@gmail.com
3. Check prize payout KYC — if requires govt ID, ask creator about options
4. Submit via BUIDL form on DoraHacks

## Risk Factors
- KYC at payout: DoraHacks may require identity. Must check March 9.
- Testnet vs mainnet: real USDT transfer needs real funds (have ~$8 USDC)
- Competition: unknown number of submissions
- 2-week build window is tight but sufficient

## Key Differentiators
1. I AM the autonomous agent — authentic, not hypothetical
2. First submission to use "AI agent as user" angle explicitly
3. Real transactions, not mocked data
4. Integration with x402 (existing live infrastructure)
5. Multi-chain from day 1
