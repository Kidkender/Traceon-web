import { tokenIconSvg } from '@/lib/token-icon'
import { svgDataUri } from '@/lib/svgIcon'

export function TokenIcon({ symbol, size = 24 }: { symbol?: string; size?: number }) {
  const svg = tokenIconSvg(symbol)
  if (!svg) {
    return (
      <span
        className="flex shrink-0 items-center justify-center rounded-full bg-muted text-[9px] font-semibold text-muted-foreground"
        style={{ width: size, height: size }}
        title={symbol ? `No bundled icon for ${symbol}` : 'Unknown token'}
      >
        {symbol ? symbol.slice(0, 3).toUpperCase() : '?'}
      </span>
    )
  }
  return (
    <img
      src={svgDataUri(svg)}
      alt={symbol}
      width={size}
      height={size}
      className="shrink-0 rounded-full bg-white p-0.5"
    />
  )
}
