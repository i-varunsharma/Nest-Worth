import SliderField from '../shared/SliderField';
import { formatRupees } from '../../lib/plan';
import { monthsText } from './shockSettings';

/* The sliders for the selected shock. onChange(key, value) updates one setting. */

const MAX_MONTHS = 12;
const MAX_MEDICAL_BILL = 2000000;
const MEDICAL_STEP = 25000;
const MAX_FAMILY_EXTRA = 100000;
const FAMILY_STEP = 1000;
const MIN_CUT = 5;
const MAX_CUT = 90;
const CUT_STEP = 5;

function MonthsSlider({ id, label, value, onChange }) {
  return (
    <SliderField id={id} label={label} value={value} valueText={monthsText(value)} min={1} max={MAX_MONTHS} step={1} onChange={onChange} />
  );
}

export default function ShockControls({ type, settings, onChange }) {
  if (type === 'job_loss') {
    return (
      <MonthsSlider id="job-months" label="How long without income" value={settings.jobMonths} onChange={(value) => onChange('jobMonths', value)} />
    );
  }

  if (type === 'income_cut') {
    return (
      <div className="grid gap-6 sm:grid-cols-2">
        <SliderField
          id="cut-percent"
          label="How much it falls"
          value={settings.cutPercent}
          valueText={settings.cutPercent + '%'}
          min={MIN_CUT}
          max={MAX_CUT}
          step={CUT_STEP}
          onChange={(value) => onChange('cutPercent', value)}
        />
        <MonthsSlider id="cut-months" label="For how long" value={settings.cutMonths} onChange={(value) => onChange('cutMonths', value)} />
      </div>
    );
  }

  if (type === 'medical') {
    return (
      <SliderField
        id="medical-amount"
        label="The hospital bill"
        value={settings.medicalAmount}
        valueText={formatRupees(settings.medicalAmount)}
        min={0}
        max={MAX_MEDICAL_BILL}
        step={MEDICAL_STEP}
        onChange={(value) => onChange('medicalAmount', value)}
      />
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <SliderField
        id="family-extra"
        label="Extra needed each month"
        value={settings.familyExtra}
        valueText={formatRupees(settings.familyExtra)}
        min={0}
        max={MAX_FAMILY_EXTRA}
        step={FAMILY_STEP}
        onChange={(value) => onChange('familyExtra', value)}
      />
      <MonthsSlider id="family-months" label="For how long" value={settings.familyMonths} onChange={(value) => onChange('familyMonths', value)} />
    </div>
  );
}
