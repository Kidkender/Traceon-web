import binanceSvg from '@web3icons/core/svgs/exchanges/branded/binance.svg.js'
import bitgetSvg from '@web3icons/core/svgs/exchanges/branded/bitget.svg.js'
import bitstampSvg from '@web3icons/core/svgs/exchanges/branded/bitstamp.svg.js'
import bybitSvg from '@web3icons/core/svgs/exchanges/branded/bybit.svg.js'
import coinbaseSvg from '@web3icons/core/svgs/exchanges/branded/coinbase.svg.js'
import gateSvg from '@web3icons/core/svgs/exchanges/branded/gate-io.svg.js'
import geminiSvg from '@web3icons/core/svgs/exchanges/branded/gemini.svg.js'
import krakenSvg from '@web3icons/core/svgs/exchanges/branded/kraken.svg.js'
import kucoinSvg from '@web3icons/core/svgs/exchanges/branded/kucoin.svg.js'
import okxSvg from '@web3icons/core/svgs/exchanges/branded/okx.svg.js'
import upbitSvg from '@web3icons/core/svgs/exchanges/branded/upbit.svg.js'
import { getSvgIconImage } from '@/lib/svgIcon'

// Real brand SVGs from @web3icons/core (MIT-licensed, purpose-built for
// identifying crypto exchanges/wallets in web3 UIs — this is the actual
// logo, not a hand-drawn stand-in).
const EXCHANGE_ICONS: Record<string, string> = {
  binance: binanceSvg,
  bitget: bitgetSvg,
  bitstamp: bitstampSvg,
  bybit: bybitSvg,
  coinbase: coinbaseSvg,
  'gate.io': gateSvg,
  gemini: geminiSvg,
  kraken: krakenSvg,
  kucoin: kucoinSvg,
  okx: okxSvg,
  upbit: upbitSvg,
}

// @web3icons/core doesn't ship these yet (checked its exchanges/ dir as of
// v4.0.54) — monogram badge is the honest fallback rather than blocking on
// a missing asset.
const MONOGRAM_FALLBACK: Record<string, { label: string; bg: string; fg: string }> = {
  huobi: { label: 'HT', bg: '#0091FF', fg: '#FFFFFF' },
  htx: { label: 'HTX', bg: '#009393', fg: '#FFFFFF' },
  bitfinex: { label: 'BFX', bg: '#16B157', fg: '#FFFFFF' },
  mexc: { label: 'MX', bg: '#00B897', fg: '#FFFFFF' },
  'crypto.com': { label: 'CDC', bg: '#0C2A5E', fg: '#FFFFFF' },
}

export type ExchangeVisual =
  | { kind: 'icon'; svg: string }
  | { kind: 'monogram'; label: string; bg: string; fg: string }

function matchKey<T>(entityName: string, table: Record<string, T>): string | undefined {
  const lower = entityName.toLowerCase()
  return Object.keys(table).find((k) => lower.includes(k))
}

function initialsOf(name: string): string {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
  return initials.slice(0, 3) || '?'
}

export function exchangeVisual(entityName: string): ExchangeVisual {
  const iconKey = matchKey(entityName, EXCHANGE_ICONS)
  if (iconKey) return { kind: 'icon', svg: EXCHANGE_ICONS[iconKey] }

  const fallbackKey = matchKey(entityName, MONOGRAM_FALLBACK)
  if (fallbackKey) return { kind: 'monogram', ...MONOGRAM_FALLBACK[fallbackKey] }

  return { kind: 'monogram', label: initialsOf(entityName), bg: '#334155', fg: '#FFFFFF' }
}

export const getExchangeIconImage = getSvgIconImage
