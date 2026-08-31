/*
  The little two-way switch that chooses between signing in with an email
  address and signing in with a mobile number.

      [  Email  ][  Phone  ]

  It does not decide anything by itself. The page above it holds the current
  choice and passes it down, and this component just calls onChange when a
  button is pressed. A component that only shows what it is told and reports
  clicks back is called a "controlled" component, and it is much easier to reason
  about than one that keeps its own secret copy of the answer.
*/

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
