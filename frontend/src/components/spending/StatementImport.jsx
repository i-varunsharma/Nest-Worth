import { useRef, useState } from 'react';
import * as api from '../../lib/api';
import { SAMPLE_STATEMENT } from '../../lib/sampleStatement';

/*
  Imports a bank statement CSV, or a sample month for somebody without one to hand.

  The file is read in the browser and its text sent as JSON, so the server never
  handles an upload.

  Props:
    onImported  called with the months the file covered
*/
export default function StatementImport({ onImported }) {
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  // A ref gives direct access to the file input, to open it from our own button and
  // clear it afterwards, so choosing the same file again still counts as a change.
  const fileInputRef = useRef(null);

  const sendToServer = async (csv) => {
    setIsWorking(true);
    setError('');
    setResult(null);

    const response = await api.importStatement(csv);

    setIsWorking(false);

    if (response.ok === false) {
      setError(response.error);
      return;
    }

    setResult(response.data);

    if (onImported) {
      onImported(response.data.months);
    }
  };

  const handleFileChosen = (event) => {
    const file = event.target.files[0];

    if (!file) {
      return;
    }

    // FileReader reads the chosen file without freezing the page, and calls back when done.
    const reader = new FileReader();

    reader.onload = () => {
      sendToServer(String(reader.result));

      // Clearing the input is what makes choosing the SAME file again fire
      // another change event. Without this, re-importing a file you just fixed
      // does nothing and looks broken.
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };

    reader.onerror = () => {
      setError('That file could not be read.');
    };

    reader.readAsText(file);
  };

  const handleSample = () => {
    sendToServer(SAMPLE_STATEMENT);
  };

  // ---- The sentence shown after an import, built before the markup ----
  let resultLine = '';

  if (result) {
    resultLine = 'Added ' + result.added + ' transactions.';

    if (result.alreadyHad > 0) {
      resultLine = resultLine + ' ' + result.alreadyHad + ' were already here, so they were left alone.';
    }

    if (result.unreadableLines > 0) {
      resultLine = resultLine + ' ' + result.unreadableLines
        + ' lines were not transactions and were skipped.';
    }
  }

  let chooseLabel = 'Choose a CSV file';
  if (isWorking === true) {
    chooseLabel = 'Reading…';
  }

  return (
    <div className="rounded-[18px] border border-dashed border-line bg-surface p-6 shadow-card">
      <p className="text-2xs font-semibold uppercase tracking-widest2 text-muted">
        Import a statement
      </p>

      <p className="mt-3 max-w-lg text-[14.5px] leading-relaxed text-ink2">
        Download a month of transactions from your bank as CSV and drop it in.
        Nothing is sent anywhere else, and the same file can be imported twice
        without doubling anything.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {/* The real file input is hidden and opened by the button, because browsers style
            file inputs in ways that cannot be made to match the page. */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv,text/plain"
          onChange={handleFileChosen}
          className="sr-only"
          id="statement-file"
        />

        <button
          type="button"
          disabled={isWorking}
          onClick={() => {
            fileInputRef.current.click();
          }}
          className="rounded-full bg-ink px-5 py-2.5 text-[13.5px] font-semibold text-paper transition-all duration-300 ease-smooth hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          {chooseLabel}
        </button>

        <button
          type="button"
          disabled={isWorking}
          onClick={handleSample}
          className="rounded-full border border-line px-5 py-2.5 text-[13.5px] font-semibold text-ink transition-all duration-300 ease-smooth hover:border-ink disabled:cursor-not-allowed disabled:opacity-50"
        >
          Try a sample month
        </button>
      </div>

      {error ? (
        <p className="mt-4 text-[13.5px] leading-relaxed text-clay">{error}</p>
      ) : null}

      {resultLine ? (
        <p className="mt-4 text-[13.5px] leading-relaxed text-accentDeep">{resultLine}</p>
      ) : null}
    </div>
  );
}
