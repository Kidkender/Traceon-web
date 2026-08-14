import usdtSvg from '@web3icons/core/svgs/tokens/branded/USDT.svg.js'
import usdcSvg from '@web3icons/core/svgs/tokens/branded/USDC.svg.js'
import ethSvg from '@web3icons/core/svgs/tokens/branded/ETH.svg.js'
import bnbSvg from '@web3icons/core/svgs/tokens/branded/BNB.svg.js'
import btcSvg from '@web3icons/core/svgs/tokens/branded/BTC.svg.js'
import wbtcSvg from '@web3icons/core/svgs/tokens/branded/WBTC.svg.js'
import solSvg from '@web3icons/core/svgs/tokens/branded/SOL.svg.js'
import daiSvg from '@web3icons/core/svgs/tokens/branded/DAI.svg.js'
import linkSvg from '@web3icons/core/svgs/tokens/branded/LINK.svg.js'
import uniSvg from '@web3icons/core/svgs/tokens/branded/UNI.svg.js'
import maticSvg from '@web3icons/core/svgs/tokens/branded/MATIC.svg.js'
import polSvg from '@web3icons/core/svgs/tokens/branded/POL.svg.js'
import arbSvg from '@web3icons/core/svgs/tokens/branded/ARB.svg.js'
import opSvg from '@web3icons/core/svgs/tokens/branded/OP.svg.js'
import avaxSvg from '@web3icons/core/svgs/tokens/branded/AVAX.svg.js'
import shibSvg from '@web3icons/core/svgs/tokens/branded/SHIB.svg.js'
import pepeSvg from '@web3icons/core/svgs/tokens/branded/PEPE.svg.js'
import xrpSvg from '@web3icons/core/svgs/tokens/branded/XRP.svg.js'
import adaSvg from '@web3icons/core/svgs/tokens/branded/ADA.svg.js'
import dogeSvg from '@web3icons/core/svgs/tokens/branded/DOGE.svg.js'
import ltcSvg from '@web3icons/core/svgs/tokens/branded/LTC.svg.js'
import trxSvg from '@web3icons/core/svgs/tokens/branded/TRX.svg.js'

// Real brand SVGs from @web3icons/core, keyed by ticker symbol. Trace edges
// on this indexer are ERC-20 Transfer events on Ethereum mainnet, so wrapped
// variants (WETH, WBTC) map to the same icon as their native ticker — the
// user cares "which coin is this", not "wrapped or not".
const TOKEN_ICONS: Record<string, string> = {
  USDT: usdtSvg,
  USDC: usdcSvg,
  ETH: ethSvg,
  WETH: ethSvg,
  BNB: bnbSvg,
  BTC: btcSvg,
  WBTC: wbtcSvg,
  SOL: solSvg,
  DAI: daiSvg,
  LINK: linkSvg,
  UNI: uniSvg,
  MATIC: maticSvg,
  POL: polSvg,
  ARB: arbSvg,
  OP: opSvg,
  AVAX: avaxSvg,
  SHIB: shibSvg,
  PEPE: pepeSvg,
  XRP: xrpSvg,
  ADA: adaSvg,
  DOGE: dogeSvg,
  LTC: ltcSvg,
  TRX: trxSvg,
}

export function tokenIconSvg(symbol: string | undefined): string | undefined {
  if (!symbol) return undefined
  return TOKEN_ICONS[symbol.toUpperCase()]
}
