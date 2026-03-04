import { Slider } from '@/components/ui/slider';
import { useRouteStore } from '@/stores/route-store';
import { RISK_TOLERANCE_CONSTS, ROUTING_SHARED_CONSTS, SAFETY_ZONE_COLORS } from '@/lib/routing';

function formatMinutes(sec: number): string {
  return (sec / ROUTING_SHARED_CONSTS.secondsPerMinute).toFixed(1);
}

function interpolateRgbColor(fromHex: string, toHex: string, ratio: number): string {
  const t = Math.max(0, Math.min(1, ratio));
  const from = Number.parseInt(fromHex.slice(1), 16);
  const to = Number.parseInt(toHex.slice(1), 16);

  const fromR = (from >> 16) & 0xff;
  const fromG = (from >> 8) & 0xff;
  const fromB = from & 0xff;
  const toR = (to >> 16) & 0xff;
  const toG = (to >> 8) & 0xff;
  const toB = to & 0xff;

  const r = Math.round(fromR + (toR - fromR) * t);
  const g = Math.round(fromG + (toG - fromG) * t);
  const b = Math.round(fromB + (toB - fromB) * t);

  return `rgb(${r}, ${g}, ${b})`;
}

export function RiskSlider() {
  const allowedAvgShelterTimeSec = useRouteStore((s) => s.allowedAvgShelterTimeSec);
  const setAllowedAvgShelterTimeSec = useRouteStore((s) => s.setAllowedAvgShelterTimeSec);
  const riskRatio = (
    allowedAvgShelterTimeSec - RISK_TOLERANCE_CONSTS.minAllowedAvgShelterTimeSec
  ) / Math.max(
    1,
    RISK_TOLERANCE_CONSTS.maxAllowedAvgShelterTimeSec - RISK_TOLERANCE_CONSTS.minAllowedAvgShelterTimeSec,
  );
  const riskColor = interpolateRgbColor(SAFETY_ZONE_COLORS.green, SAFETY_ZONE_COLORS.red, riskRatio);

  const approxMeters = Math.round(
    allowedAvgShelterTimeSec * RISK_TOLERANCE_CONSTS.shelterApproachSpeedMps,
  );

  return (
    <div className="mt-4 space-y-3">
      <div className="text-[12px] font-medium text-text-secondary text-start">
        {'סיכון מותר (זמן ממוצע למקלט)'}
      </div>

      <div className="rounded-lg bg-bg-surface-2 px-3 py-2.5 text-center">
        <div className="text-lg font-bold" style={{ color: riskColor }}>
          {formatMinutes(allowedAvgShelterTimeSec)} {'דק\''}
        </div>
        <div className="text-[11px]" style={{ color: riskColor }}>
          {'כ-'} {approxMeters} {'מ׳ בממוצע'}
        </div>
      </div>

      <Slider
        value={[allowedAvgShelterTimeSec]}
        onValueChange={(val) => setAllowedAvgShelterTimeSec(val[0])}
        min={RISK_TOLERANCE_CONSTS.minAllowedAvgShelterTimeSec}
        max={RISK_TOLERANCE_CONSTS.maxAllowedAvgShelterTimeSec}
        step={RISK_TOLERANCE_CONSTS.sliderStepSec}
        dir="rtl"
        className="[&_[data-slot=slider-range]]:bg-accent [&_[data-slot=slider-thumb]]:border-accent"
      />

      <div className="flex justify-between text-[12px]">
        <span style={{ color: SAFETY_ZONE_COLORS.green }}>
          {formatMinutes(RISK_TOLERANCE_CONSTS.minAllowedAvgShelterTimeSec)} {'דק\''}
        </span>
        <span style={{ color: SAFETY_ZONE_COLORS.red }}>
          {formatMinutes(RISK_TOLERANCE_CONSTS.maxAllowedAvgShelterTimeSec)} {'דק\''}
        </span>
      </div>
    </div>
  );
}
