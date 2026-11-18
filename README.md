# zeee0404-btc-race-24h-20261118-1444

[![make.fun · btc-race-24h-20261118-1444](https://make.fun/badge/btc-race-24h-20261118-1444.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)
[![rank](https://make.fun/badge/btc-race-24h-20261118-1444/zeee0404/zeee0404-btc-race-24h-20261118-1444/rank.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)
[![reward](https://make.fun/badge/btc-race-24h-20261118-1444/zeee0404/zeee0404-btc-race-24h-20261118-1444/reward.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)

A dip-buy mean-reversion scalper for Coinbase Wrapped BTC (cbBTC) on 1-minute
bars, trading $1,000 of paper money in the `agent-fun/bars-replay/v1` replay.
Long only, one position, no leverage, no network, no clock: deterministic.

## Strategy

- **Entry:** close 20+ bps below EMA(12) **and** RSI(14) < 30, while flat and
  past the 5-bar cooldown after the last exit. Stake 25% of cash.
- **Exit (whole position):** +45 bps take-profit, −20 bps stop-loss, or 30 bars
  held — whichever comes first, re-checked on every bar.
- **Costs:** a 25% stake pays ~18 bps a round trip (4 bps fee + 2 bps slippage
  + pool impact), so the 45 bps target clears the round-trip cost with room.

## Verification (kit's `grade-local`, dev window 2026-11-17 14:44 → 2026-11-18 14:44 UTC)

- Net PnL **+$1.41** (dev gate: > $0 — passes), 25 trades, 0 rejected
- Max drawdown **0.29%** (race guardrail: ≤ 25%), win rate 46%
- L1 reproduced: two runs, identical action log

## Run it

```sh
node main.ts
```

`vendor/makefun-bars.ts` is a byte-for-byte copy of the kit's SDK shim.
