// The Email and Phone switch on the auth pages. A controlled component: the page
// holds the choice and this only reports clicks.

const options = [
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
];

export default function MethodTabs({ value, onChange }) {
  return (
    <div className="flex gap-1 rounded-full border border-line bg-paperDeep p-1">
      {options.map((option) => {
        const isChosen = value === option.value;

        // Build the classes step by step so the JSX below stays short.
        let tabClasses = 'flex-1 rounded-full px-4 py-2 text-[13.5px] font-semibold transition-all duration-300 ease-smooth ';

        if (isChosen === true) {
          tabClasses = tabClasses + 'bg-surface text-ink shadow-card';
        } else {
          tabClasses = tabClasses + 'text-muted hover:text-ink';
        }

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={isChosen}
            className={tabClasses}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
