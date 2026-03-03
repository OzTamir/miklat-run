import type { RouteSegment } from '@/types';

interface SegmentCardProps {
  segment: RouteSegment;
  isActive: boolean;
  onClick: () => void;
}

export function SegmentCard({ segment, isActive, onClick }: SegmentCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full cursor-pointer flex-col gap-1 border-l-0 px-5 py-3 text-right transition-colors duration-150 hover:bg-white/[0.03] ${
        isActive ? 'bg-accent-dim' : ''
      }`}
      style={{ borderRight: `3px solid ${segment.color}` }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[13px] font-medium text-text-primary">
          <span
            className="inline-block size-[10px] shrink-0 rounded-full"
            style={{ background: segment.color }}
          />
          {'\u05E7\u05D8\u05E2'} {segment.index + 1}
        </div>
        <span className="text-[12px] text-text-muted">
          {segment.distance} {'\u05DE\u05F3'}
        </span>
      </div>

      <div className="flex items-center gap-1 text-[12px] text-text-secondary">
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="shrink-0"
        >
          <path d="M12 2v20M5 9l7-7 7 7" />
        </svg>
        <span>
          {segment.direction}
          {segment.streetName ? ` \u2014 ${segment.streetName}` : ''}
        </span>
      </div>

      <div className="flex items-center gap-1 text-[11px] leading-relaxed text-text-muted">
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="shrink-0 opacity-60"
        >
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
        <span>
          {segment.nearestShelter
            ? `${segment.nearestShelter.address} \u2014 ${segment.nearestShelterDist} \u05DE\u05F3`
            : '\u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0 \u05DE\u05E7\u05DC\u05D8 \u05E7\u05E8\u05D5\u05D1'}
        </span>
      </div>
    </button>
  );
}
