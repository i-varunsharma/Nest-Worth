import { Component } from 'react';

/*
  Catches a crash while rendering any page below it and shows a message instead
  of a blank screen.

  A class, because React only offers error boundaries as class components. It does
  not catch errors in event handlers or after an await; the app handles those
  where they happen.
*/
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasCrashed: false };
  }

  // Called by React when a child throws; the returned state shows the fallback.
  static getDerivedStateFromError() {
    return { hasCrashed: true };
  }

  // Logs the error. A deployed site would send it to an error reporting service here.
  componentDidCatch(error, info) {
    console.error('A page crashed:', error, info);
  }

  render() {
    if (this.state.hasCrashed === true) {
      return (
        <div className="grid min-h-screen place-items-center bg-paper px-6">
          <div className="max-w-sm text-center">
            <p className="text-2xs font-semibold uppercase tracking-widest2 text-muted">
              Something broke
            </p>

            <h1 className="mt-4 font-display text-[28px] leading-tight tracking-[-0.02em]">
              This page stopped working.
            </h1>

            <p className="mt-4 text-[14.5px] leading-relaxed text-ink2">
              Nothing you have saved is affected. Reloading usually fixes it.
            </p>

            {/* A full reload, since the app is in an unknown state. */}
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-7 rounded-full bg-ink px-6 py-3 text-[14.5px] font-semibold text-paper transition-colors duration-300 hover:bg-accent"
            >
              Reload the page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
