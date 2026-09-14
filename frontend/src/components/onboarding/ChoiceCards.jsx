/*
  Two or more large option buttons, one of which is chosen.

    options   [{ value, label, note }]
    value     the chosen value
    onChange  called with the new value
*/
export default function ChoiceCards({ options, value, onChange }) {
  return (
    <div className="grid max-w-lg gap-3 sm:grid-cols-2">
      {options.map((option) => {
        const isChosen = option.value === value;

        let optionClasses = 'rounded-2xl border p-5 text-left transition-all duration-300 ease-smooth ';
        let noteClasses = 'mt-2 block text-[13px] ';

        if (isChosen === true) {
          optionClasses = optionClasses + 'border-ink bg-ink text-paper';
          noteClasses = noteClasses + 'text-paper/60';
        } else {
          optionClasses = optionClasses + 'border-line bg-surface text-ink hover:border-ink';
          noteClasses = noteClasses + 'text-muted';
        }

        // React keys must be text, and true or false is not.
        return (
          <button
            key={String(option.value)}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={isChosen}
            className={optionClasses}
          >
            <span className="block text-[15.5px] font-semibold">{option.label}</span>
            <span className={noteClasses}>{option.note}</span>
          </button>
        );
      })}
    </div>
  );
}
