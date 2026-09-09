/*
  The plan comparison lives in shared/scenarios.js at the top of the project,
  and this file passes it straight through.

  It is up there because the browser and the server both need it: the server
  plays every plan out and hands the result to the AI as a tool, and the
  dashboard uses applyChosenPlan to show whichever one was picked. Two copies
  would eventually disagree about where a choice lands.
*/
export * from '../../../shared/scenarios.js';
