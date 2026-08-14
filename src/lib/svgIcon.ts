// Shared by exchange.ts and token.ts: turns a bundled brand SVG string into
// a same-origin data: URI (no network fetch, no CORS) — safe for both a DOM
// <img src> and a canvas drawImage() once loaded.
export function svgDataUri(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

// Canvas needs an already-loaded HTMLImageElement to drawImage() with, and
// react-force-graph-2d redraws every node every frame — recreating Image()
// each call would never finish decoding before the next paint. Cached by
// SVG content so exchange and token icons share one pool.
const imageCache = new Map<string, HTMLImageElement>()

export function getSvgIconImage(svg: string, onLoad: () => void): HTMLImageElement {
  const cached = imageCache.get(svg)
  if (cached) return cached

  const img = new Image()
  img.onload = onLoad
  img.src = svgDataUri(svg)
  imageCache.set(svg, img)
  return img
}
