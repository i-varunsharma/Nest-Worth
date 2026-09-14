/*
  A row of pill buttons where one is selected, such as the months on the spending
  page or the plans on the plans page.

    <PillGroup
      options={[{ key: '2026-08', label: 'August 2026', detail: '42' }]}
      selectedKey={month}
      onSelect={setMonth}
    />

  Each option: key, label, and optionally detail (a faint number after the label)
  and marker (true to show a small dot, for example "the plan you follow").
  Real buttons with aria-pressed, so keyboards and screen readers work without
  extra code.
*/
export default function PillGroup({ options, selectedKey, onSelect, markerLabel }) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {options.map((option) => {
        const isSelected = option.key === selectedKey;

        let classes = 'rounded-full border px-4 py-2 text-[13.5px] font-semibold transition-all duration-300 ease-smooth ';
        let markerClasses = 'ml-2 inline-block h-1.5 w-1.5 rounded-full align-middle ';

        if (isSelected === true) {
          classes = classes + 'border-accent bg-accent text-paper shadow-card';
          markerClasses = markerClasses + 'bg-paper';
        } else {
          classes = classes + 'border-line bg-surface text-ink2 hover:border-ink hover:text-ink';
          markerClasses = markerClasses + 'bg-accent';
        }

        return (
          <button
            key={option.key}
            type="button"
            onClick={() => onSelect(option.key)}
            aria-pressed={isSelected}
            className={classes}
          >
            {option.label}
            {option.detail ? <span className="ml-2 font-normal opacity-70">{option.detail}</span> : null}
            {option.marker === true ? <span aria-label={markerLabel} className={markerClasses} /> : null}
          </button>
        );
      })}
    </div>
  );
}
