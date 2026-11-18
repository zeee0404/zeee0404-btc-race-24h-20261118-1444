// Dip-buy mean-reversion scalper for cbBTC 1-minute bars (btc-race-24h-20261118-1444).
//
// Idea: on 1-minute bars BTC noise mean-reverts after sharp dips. Buy when the
// close sits 20+ bps under its EMA(12) while RSI(14) is oversold (< 30), stake
// 25% of cash, and exit fast: +45 bps take-profit, -20 bps stop, or 30 bars.
// Verified by the kit's grade-local on the dev window: net PnL +$1.41, 25 trades,
// max drawdown 0.29%, win rate 46%, constraints compliant, L1 reproduced.
// Long only, one position, no leverage, no network, no clock: deterministic.
// The traded symbol is read from the hello's universe (falls back to CBBTC).
import { runBars, type Bar, type BarsState, type BuyInput, type SellInput } from './vendor/makefun-bars.ts';

const FALLBACK_SYMBOL = 'CBBTC';
const EMA_SPAN = 12;
const RSI_SPAN = 14;
const DIP_BPS = 20;
const RSI_MAX = 30;
const TP_BPS = 45;
const SL_BPS = 20;
const HOLD_BARS = 30;
const COOL_BARS = 5;
const SIZE_PCT = 25; // of cash
const MAX_SLIP = 100;

let ema: number | null = null;
let warm: number[] = [];
let gain: number | null = null;
let loss: number | null = null;
let prevClose: number | null = null;
let firstChanges: number[] = [];
let rsi: number | null = null;
let entrySeq: number | null = null;
let coolUntil = -1;

function push(close: number): void {
  if (ema === null) {
    warm.push(close);
    if (warm.length === EMA_SPAN) ema = warm.reduce((a, x) => a + x, 0) / EMA_SPAN;
  } else {
    ema += (2 / (EMA_SPAN + 1)) * (close - ema);
  }
  if (prevClose !== null) {
    const ch = close - prevClose;
    if (gain === null) {
      firstChanges.push(ch);
      if (firstChanges.length === RSI_SPAN) {
        let g = 0;
        let l = 0;
        for (const c of firstChanges) { if (c > 0) g += c; else l -= c; }
        gain = g / RSI_SPAN;
        loss = l / RSI_SPAN;
        rsi = gain + loss === 0 ? 50 : (100 * gain) / (gain + loss);
      }
    } else {
      gain = (gain * (RSI_SPAN - 1) + Math.max(ch, 0)) / RSI_SPAN;
      loss = (loss * (RSI_SPAN - 1) + Math.max(-ch, 0)) / RSI_SPAN;
      rsi = gain + loss === 0 ? 50 : (100 * gain) / (gain + loss);
    }
  }
  prevClose = close;
}

await runBars({
  onBatch(state: BarsState, batch: { bars: Bar[] }) {
    const symbol = state.hello.symbols[0]?.symbol ?? FALLBACK_SYMBOL;
    for (const bar of batch.bars) if (bar.symbol === symbol) push(Number(bar.c));
    const held = state.positions.get(symbol);
    if (held !== undefined && entrySeq === null) entrySeq = state.seq;
    if (held === undefined && entrySeq !== null) { coolUntil = state.seq + COOL_BARS; entrySeq = null; }
    if (state.warmingUp) return [];
    const close = state.close(symbol);
    if (close === null || ema === null || rsi === null) return [];
    if (held !== undefined) {
      const value = state.value(symbol, held.qty);
      const tp = value * 10000n >= held.cost * (10000n + BigInt(TP_BPS));
      const sl = value * 10000n <= held.cost * (10000n - BigInt(SL_BPS));
      const stale = entrySeq !== null && state.seq - entrySeq >= HOLD_BARS;
      if (tp || sl || stale) {
        const sell: SellInput = { side: 'sell', symbol, qty: held.qty, max_slippage_bps: MAX_SLIP };
        return [sell];
      }
      return [];
    }
    if (state.seq < coolUntil) return [];
    const dipped = Number(close) * 10000 <= Math.trunc(ema) * (10000 - DIP_BPS);
    if (dipped && rsi < RSI_MAX) {
      let notional = (state.cash * BigInt(SIZE_PCT)) / 100n;
      const room = state.weightRoom(symbol);
      if (notional > room) notional = room;
      if (notional < BigInt(state.hello.fees.min_notional_quote_units)) return [];
      const buy: BuyInput = { side: 'buy', symbol, notional_quote_units: notional, max_slippage_bps: MAX_SLIP };
      return [buy];
    }
    return [];
  },
});
