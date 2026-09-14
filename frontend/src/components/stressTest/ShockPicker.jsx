import { SHOCK_TYPES, shockTitle } from '../../lib/shocks';
import { VERDICT_LOOKS } from './shockSettings';

/* The four shocks as tabs, each showing its current verdict. */
export default function ShockPicker({ results, selectedType, onSelect }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" role="tablist" aria-label="Shocks">
      {SHOCK_TYPES.map((type) => {
        const isSelected = type === selectedType;
        const looks = VERDICT_LOOKS[results[type].verdict];

        let classes = 'rounded-[18px] border bg-surface p-4 text-left transition-all duration-300 ease-smooth ';
        if (isSelected === true) {
          classes = classes + 'border-ink shadow-lift';
        } else {
          classes = classes + 'border-line hover:border-ink/40';
        }

        return (
          <button
            key={type}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => onSelect(type)}
            className={classes}
          >
            <span className="block text-[15px] font-semibold text-ink">{shockTitle(type)}</span>
            <span className="mt-1.5 flex items-center gap-2 text-2xs text-muted">
              <span aria-hidden="true" className={'h-2 w-2 rounded-full ' + looks.dot} />
              {looks.word}
            </span>
          </button>
        );
      })}
    </div>
  );
}
