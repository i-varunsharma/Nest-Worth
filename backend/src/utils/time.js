// Lengths of time in milliseconds, which is what Date and setTimeout use.
// Written once here so "15 * 60 * 1000" is not repeated (and mistyped) across files.

export const MINUTE_MS = 60 * 1000;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;
