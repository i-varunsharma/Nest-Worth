import { useEffect, useState } from 'react';

/*
  Loads data for a page, and tracks whether it is loading or failed.

    const page = useAsyncData(loadGoalsPage);
    const month = useAsyncData(loadMonth, chosenMonth);

    page.error      a message when loading failed, otherwise ''
    page.data       null until loaded
    page.reload()   loads again, for example after something was saved

  load is an async function defined outside the component, returning the api.js
  shape { ok: true, data } or { ok: false, error }. It is called as load(key),
  and called again whenever key changes.

  An answer that arrives after the page was left, or after a newer load started,
  is ignored, so a slow old request cannot overwrite newer data. Data already on
  screen stays there while a reload is in progress, so the page does not flash.
*/
export default function useAsyncData(load, key) {
  const [state, setState] = useState({ data: null, error: '' });
  const [loadCount, setLoadCount] = useState(0);

  useEffect(() => {
    // Cleared by the cleanup when this load is no longer the latest.
    let isLatest = true;

    load(key).then((result) => {
      if (isLatest === false) {
        return;
      }

      if (result.ok === true) {
        setState({ data: result.data, error: '' });
      } else {
        setState({ data: null, error: result.error });
      }
    });

    return () => {
      isLatest = false;
    };
  }, [load, key, loadCount]);

  function reload() {
    setLoadCount(loadCount + 1);
  }

  return { data: state.data, error: state.error, reload: reload };
}
