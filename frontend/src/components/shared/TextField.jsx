import { useState } from 'react';

/*
  One labelled input box, used by every form on the site.

  Example:

    <TextField
      id="email"
      label="Email"
      type="email"
      value={email}
      onChange={setEmail}
      error={errors.email}
      placeholder="you@example.com"
    />

  Notice that onChange receives the plain text, not the browser event. That
  keeps the page files easier to read.

  Two extras:
    type="password"  adds a small Show / Hide toggle, because making people
                     retype a long password they cannot see is unkind.
    prefix="+91"     puts fixed text inside the box, before what they type.
*/
export default function TextField({
  id,
  label,
  type,
  value,
  onChange,
  error,
  placeholder,
  hint,
  prefix,
  inputMode,
  maxLength,
  autoComplete,
}) {
  // Only used for password fields: is the password currently readable?
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const isPasswordField = type === 'password';

  // Decide what the input's real type should be. A password field switches
  // between "password" and "text" as the toggle is pressed.
  let inputType = type;
  if (isPasswordField === true && isPasswordVisible === true) {
    inputType = 'text';
  }

  // A field with a problem gets a red border, so the eye goes straight to it.
  let borderStyles = 'border-line focus-within:border-accent';
  if (error) {
    borderStyles = 'border-clay focus-within:border-clay';
  }

  const handleTyping = (event) => {
    // event.target.value is whatever the person has typed so far.
    onChange(event.target.value);
  };

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  // The Show / Hide button, or nothing at all for normal fields.
  let passwordToggle = null;
  if (isPasswordField === true) {
    let toggleLabel = 'Show';
    if (isPasswordVisible === true) {
      toggleLabel = 'Hide';
    }

    passwordToggle = (
      <button
        type="button"
        onClick={togglePasswordVisibility}
        className="shrink-0 rounded-lg px-2 py-1 text-2xs font-semibold uppercase tracking-widest2 text-muted transition-colors hover:text-ink"
      >
        {toggleLabel}
      </button>
    );
  }

  // The fixed text inside the box, like the "+91" on a phone number.
  let prefixText = null;
  if (prefix) {
    prefixText = (
      <span className="shrink-0 border-r border-line pr-3 text-[15px] text-muted">
        {prefix}
      </span>
    );
  }

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-[13px] font-medium text-ink2">
        {label}
      </label>

      {/*
        The border is on this wrapper rather than the input, so the prefix and
        the Show button sit inside the same box as the text. focus-within means
        "highlight me when anything inside me is focused".
      */}
      <div className={'flex items-center gap-3 rounded-xl border bg-surface px-4 transition-colors duration-300 ' + borderStyles}>
        {prefixText}

        <input
          id={id}
          name={id}
          type={inputType}
          value={value}
          onChange={handleTyping}
          placeholder={placeholder}
          inputMode={inputMode}
          maxLength={maxLength}
          autoComplete={autoComplete}
          className="w-full bg-transparent py-3 text-[15px] text-ink outline-none placeholder:text-muted/70"
        />

        {passwordToggle}
      </div>

      {/* Show the error if there is one, otherwise the hint if there is one. */}
      {error ? <p className="mt-2 text-2xs text-clay">{error}</p> : null}

      {!error && hint ? <p className="mt-2 text-2xs text-muted">{hint}</p> : null}
    </div>
  );
}
