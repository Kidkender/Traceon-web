export type AttributionLevel = 'confirmed' | 'likely' | 'unknown'

// Buckets a raw attribution confidence (0-1, EntityAddress.Confidence on
// the backend) into the three tiers a tracing tool needs to show instead of
// ever presenting a label as flat fact — see discuss.txt: "this is what
// distinguishes a tracing system from a graph visualization app." Source
// isn't part of the bucketing on its own; confidence is meant to already
// account for how trustworthy the source is (an official disclosure and a
// high-confidence heuristic can both earn "Confirmed").
const CONFIRMED_THRESHOLD = 0.9
const LIKELY_THRESHOLD = 0.5

export function attributionLevel(confidence: number | undefined): AttributionLevel {
  if (confidence === undefined) return 'unknown'
  if (confidence >= CONFIRMED_THRESHOLD) return 'confirmed'
  if (confidence >= LIKELY_THRESHOLD) return 'likely'
  return 'unknown'
}

const SOURCE_LABELS: Record<string, string> = {
  manual: 'Manual',
  official: 'Official',
  community_dataset: 'Community dataset',
  heuristic: 'Heuristic',
}

export function formatSource(source: string | undefined): string {
  if (!source) return 'Unknown source'
  return SOURCE_LABELS[source] ?? source
}
