import { StrictMode } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CoachCard from '../src/components/dashboard/CoachCard';

/*
  Tests for the AI coach card. Run with: npm test

  The api is faked, so no request leaves the test and nothing is sent to Google.
*/

vi.mock('../src/lib/api', () => {
  return {
    askCoach: async (question, history, onEvent) => {
      onEvent({ type: 'tool', label: 'Checking your safety net' });
      onEvent({ type: 'text', text: 'Build your emergency fund first.' });
      onEvent({ type: 'done' });
    },
  };
});


// Regression: StrictMode (on in main.jsx) mounts, unmounts and mounts again in
// development. The card's "still on screen" flag stayed false after that, so it
// dropped every answer and showed "Thinking" forever on localhost.
test('regression: the answer shows up when the card is inside StrictMode', async () => {
  render(
    <StrictMode>
      <CoachCard hasDebts={false} />
    </StrictMode>,
  );

  await userEvent.click(screen.getByRole('button', { name: 'What should I do this month?' }));

  expect(await screen.findByText('Build your emergency fund first.')).toBeInTheDocument();
  expect(screen.queryByText('Thinking')).toBe(null);
});
