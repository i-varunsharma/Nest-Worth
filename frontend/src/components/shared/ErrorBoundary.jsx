import { Component } from 'react';

/*
  Catches a crash in any page below it and shows something readable instead of
  a blank white screen.

  When a React component throws while rendering, React removes the whole tree
  rather than leave a half-drawn page on screen. Without one of these, the
  result is a completely white browser window with the reason only in the
  console, which is the worst possible thing to show somebody looking at their
  own finances.

  This is the one place in the project written as a class rather than a
  function. React has no hook for catching render errors: componentDidCatch and
  getDerivedStateFromError only exist on classes. It is not a style choice, and
  the React documentation says the same thing.

  What it does NOT catch, because React cannot: errors inside an event handler,
  or inside an async function after an await. Those are ordinary JavaScript
  errors and never reach React's renderer. Everything in this app that fetches
  already handles its own failures, which is why that gap is acceptable here.
*/
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasCrashed: false };
  }

  /*
    React calls this when a child throws, and whatever it returns becomes the
    new state. It runs before the screen is redrawn, which is why the fallback
    appears rather than the blank page.
  */
  static getDerivedStateFromError() {
    return { hasCrashed: true };
  }

  /*
    Called after the crash, for the reporting.

    The real error goes to the console, which is where a developer looks. On a
    deployed site this is where you would send it to something like Sentry, so
    you hear about a broken page from your own logs rather than from a user.
  */
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

            {/*
              A plain reload rather than a router link. Whatever went wrong left
              the app in a state we cannot reason about, so starting the whole
              thing again is the honest fix.
            */}
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
