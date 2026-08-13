export function Logo({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ''}`}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="5" cy="5" r="2.5" className="fill-primary" />
        <circle cx="19" cy="6" r="2" className="fill-accent" />
        <circle cx="12" cy="19" r="2.5" className="fill-primary" />
        <path
          d="M6.8 6.3 10.5 17.3M14 18l4.2-10.5M6 5.5h11"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          className="text-muted-foreground/60"
        />
      </svg>
      <span className="text-lg font-semibold tracking-tight">
        Trace<span className="text-primary">on</span>
      </span>
    </span>
  )
}
