/*
  A labelled slider, styled with the same .range-track class the debt card uses.

    <SliderField
      id="months"
      label="How long"
      value={4}
      valueText="4 months"
      min={1}
      max={12}
      step={1}
      onChange={setMonths}
    />

  Like TextField, onChange receives the number rather than the browser event.

  The filled part of the track is drawn with a background size, because a
  plain range input has no separate "filled" element to colour.
*/
export default function SliderField({ id, label, value, valueText, min, max, step, onChange }) {
  let filledPercent = 0;
  if (max > min) {
    filledPercent = ((value - min) / (max - min)) * 100;
  }

  const handleChange = (event) => {
    onChange(Number(event.target.value));
  };

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="text-[13.5px] font-medium text-ink2">
          {label}
        </label>
        <span className="tnum text-[14px] font-semibold text-ink">{valueText}</span>
      </div>

      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleChange}
        style={{ backgroundSize: filledPercent + '% 100%' }}
        className="range-track mt-3"
      />
    </div>
  );
}
