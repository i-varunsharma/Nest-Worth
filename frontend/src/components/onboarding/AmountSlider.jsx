import { formatRupees } from '../../lib/plan';

/* A large rupee slider with its value shown above and the range labelled below. */
export default function AmountSlider({ id, label, value, min, max, step, lowLabel, highLabel, onChange }) {
  let filledPercent = 0;
  if (max > min) {
    filledPercent = ((value - min) / (max - min)) * 100;
  }

  return (
    <div className="max-w-lg">
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-[13px] font-medium text-ink2">{label}</label>
        <span className="tnum font-display text-[32px] leading-none">{formatRupees(value)}</span>
      </div>

      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{ backgroundSize: filledPercent + '% 100%' }}
        className="range-track mt-5"
      />

      <div className="mt-2 flex justify-between text-2xs text-muted">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  );
}
