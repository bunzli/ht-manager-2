interface DumbbellIconProps {
  opacity?: number;
  className?: string;
}

export function DumbbellIcon({ opacity = 1, className = "" }: DumbbellIconProps) {
  return (
    <svg
      viewBox="0 0 24 16"
      width={20}
      height={14}
      className={className}
      aria-hidden
    >
      <g fill="currentColor" opacity={opacity}>
        <rect x="0" y="4" width="4" height="8" rx="1" />
        <rect x="20" y="4" width="4" height="8" rx="1" />
        <rect x="4" y="7" width="16" height="2" rx="0.5" />
      </g>
    </svg>
  );
}
