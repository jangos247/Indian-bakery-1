import { VegType } from '../types/bakery';

interface VegIndicatorProps {
  type?: VegType;
  showLabel?: boolean;
}

export function VegIndicator({ type = 'veg', showLabel = false }: VegIndicatorProps) {
  const color =
    type === 'non_veg'
      ? '#B91C1C'
      : type === 'egg'
        ? '#B45309'
        : '#15803D';

  const label =
    type === 'non_veg'
      ? 'Non-Veg'
      : type === 'egg'
        ? 'Contains Egg'
        : 'Pure Veg';

  return (
    <span className="inline-flex items-center gap-1.5 shrink-0" title={label}>
      <span
        aria-label={label}
        className="w-3.5 h-3.5 rounded-[3px] border flex items-center justify-center bg-[#FFFDF9]"
        style={{ borderColor: color }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: color }}
        />
      </span>
      {showLabel && (
        <span className="text-[11px] font-medium" style={{ color }}>
          {label}
        </span>
      )}
    </span>
  );
}
