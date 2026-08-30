/*
  SelectField
  -----------
  A labelled dropdown, styled to match TextField so forms look consistent.

    <SelectField
      id="kind"
      label="What kind?"
      value={kind}
      onChange={setKind}
      options={[{ value: 'education', label: 'Education loan' }]}
    />

  Like TextField, onChange receives the chosen value rather than the browser
  event, which keeps the pages that use it easier to read.

  The arrow is drawn as a background image rather than an element, because a
  <select> cannot contain anything but <option> tags. appearance-none switches
  off the browser's own arrow first, otherwise there would be two.
*/
export default function SelectField({ id, label, value, onChange, options, error, hint }) {
  let borderStyles = 'border-line focus:border-accent';
  if (error) {
    borderStyles = 'border-clay focus:border-clay';
  }

  const handleChange = (event) => {
    onChange(event.target.value);
  };

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-[13px] font-medium text-ink2">
        {label}
      </label>

      <select
        id={id}
        name={id}
        value={value}
        onChange={handleChange}
        className={
          'w-full appearance-none rounded-xl border bg-surface bg-no-repeat px-4 py-3 '
          + 'text-[15px] text-ink outline-none transition-colors duration-300 '
          + borderStyles
        }
        style={{
          // A small chevron, drawn inline so there is no image file to load.
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%237A7168' stroke-width='1.6' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
          backgroundPosition: 'right 1rem center',
        }}
      >
        {options.map((option) => {
          return (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          );
        })}
      </select>

      {error ? <p className="mt-2 text-2xs text-clay">{error}</p> : null}
      {!error && hint ? <p className="mt-2 text-2xs text-muted">{hint}</p> : null}
    </div>
  );
}
