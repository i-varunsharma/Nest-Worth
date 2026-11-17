import TextField from '../shared/TextField';
import { formatRupees } from '../../lib/format';

/*
  A large rupee slider with its value shown above and the range labelled below.

  allowTyping adds a box for an exact figure. A slider moves in steps and stops
  at its ends, so somebody earning ₹18,500 or ₹4,00,000 could not enter their
  real income without it. A typed value outside the range is kept as typed;
  the slider just sits at its end.
*/
export default function AmountSlider({ id, label, value, min, max, step, lowLabel, highLabel, onChange, allowTyping }) {
  let filledPercent = 0;
  if (max > min) {
    filledPercent = ((value - min) / (max - min)) * 100;
  }

  // A typed value can be past either end of the slider.
  if (filledPercent < 0) {
    filledPercent = 0;
  }
  if (filledPercent > 100) {
    filledPercent = 100;
  }

  // Keeps only the digits, so "62,000" and "₹62000" both work.
  function handleTyped(text) {
    const digits = text.replace(/[^0-9]/g, '');
    onChange(Number(digits));
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

      {allowTyping === true ? (
        <div className="mt-5 max-w-[240px]">
          <TextField
            id={id + '-exact'}
            label="Or type the exact amount"
            type="text"
            value={String(value)}
            onChange={handleTyped}
            prefix="₹"
            inputMode="numeric"
          />
        </div>
      ) : null}
    </div>
  );
}
