import { checkGoals } from './checkGoals.js';
import { comparePlans } from './comparePlans.js';
import { emergencyFund } from './emergencyFund.js';
import { simulateExtraPayment } from './simulateExtraPayment.js';
import { simulateHouseholdChange } from './simulateHouseholdChange.js';
import { spendingTrend } from './spendingTrend.js';
import { stressTest } from './stressTest.js';

/*
  The calculations the AI coach may ask the server to run.

  One file per tool in this folder. Every tool calls the same code in shared/
  that draws the pages, so the coach cannot quote a payoff date or a plan the
  app disagrees with.

  Each tool is an object with:
    description   when to use it, written for the model
    input_schema  its arguments, as JSON Schema
    describe      a short line shown on the coach card while it runs
    run           (userId, input) => text for the model to read

  The user id always comes from the session. No tool accepts an argument that
  names a person.

  To add a tool: make a new file next to these, then add it to TOOLS below.
*/


// Most questions need one or two rounds. The cap stops a runaway loop spending money.
export const MAX_TOOL_ROUNDS = 5;


// The name on the left is what the model sees and asks for.
const TOOLS = {
  simulate_extra_payment: simulateExtraPayment,
  simulate_household_change: simulateHouseholdChange,
  check_goals: checkGoals,
  compare_plans: comparePlans,
  spending_trend: spendingTrend,
  emergency_fund: emergencyFund,
  stress_test: stressTest,
};


// The tools in the provider-neutral shape: name, description, input_schema.
export function toolDefinitions() {
  const list = [];

  for (const name of Object.keys(TOOLS)) {
    list.push({
      name: name,
      description: TOOLS[name].description,
      input_schema: TOOLS[name].input_schema,
    });
  }

  return list;
}


/* A short line for the browser to show while a tool runs. */
export function describeTool(name, input) {
  const tool = TOOLS[name];

  if (!tool) {
    return 'Working';
  }

  return tool.describe(input);
}


// Runs one tool and returns text for the model. A tool that throws returns a
// sentence instead, so one failed calculation does not end the whole answer.
export function runTool(userId, name, input) {
  const tool = TOOLS[name];

  if (!tool) {
    return 'There is no tool called ' + name + '.';
  }

  let safeInput = input;
  if (!safeInput || typeof safeInput !== 'object') {
    safeInput = {};
  }

  try {
    return tool.run(userId, safeInput);
  } catch (error) {
    console.error('Tool ' + name + ' failed:', error);
    return 'That calculation failed. Tell the person you could not work it out.';
  }
}
