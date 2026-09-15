import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AppShell from '../src/components/layout/AppShell';
import { SECTIONS, findSection } from '../src/lib/navigation';

/*
  Tests for the sidebar sections and the tabs inside each section.
  Run with: npm test
*/

vi.mock('../src/lib/api', () => {
  return {
    logout: async () => {
      return { ok: true, data: {} };
    },
  };
});

function renderShellAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppShell user={{ name: 'Varun' }} title="A page">
        <p>Page content</p>
      </AppShell>
    </MemoryRouter>,
  );
}


test('every page address belongs to exactly one section', () => {
  const seen = {};

  for (const section of SECTIONS) {
    for (const page of section.pages) {
      expect(seen[page.to]).toBeUndefined();
      seen[page.to] = section.key;
    }
  }

  expect(findSection('/goals').key).toBe('plan');
  expect(findSection('/family').key).toBe('money');
  expect(findSection('/recap').key).toBe('track');
  expect(findSection('/settings')).toBe(null);
});


test('the sidebar lists only section headings and marks the current one', () => {
  renderShellAt('/goals');

  const sidebar = screen.getByRole('navigation', { name: 'Sections' });
  const links = within(sidebar).getAllByRole('link');

  expect(links).toHaveLength(SECTIONS.length);
  expect(within(sidebar).getByRole('link', { name: 'Plan' })).toHaveAttribute('aria-current', 'page');
  expect(within(sidebar).getByRole('link', { name: 'Track' })).not.toHaveAttribute('aria-current');

  // Pages inside a section are not in the sidebar.
  expect(within(sidebar).queryByRole('link', { name: 'Goals' })).not.toBeInTheDocument();
});


test('a section heading goes to the first page in that section', () => {
  renderShellAt('/dashboard');

  const sidebar = screen.getByRole('navigation', { name: 'Sections' });

  expect(within(sidebar).getByRole('link', { name: 'Your money' })).toHaveAttribute('href', '/net-worth');
});


test('the tabs show the pages of the current section', () => {
  renderShellAt('/debts');

  const tabs = screen.getByRole('navigation', { name: 'Pages in Your money' });

  expect(within(tabs).getByRole('link', { name: 'Net worth' })).toBeInTheDocument();
  expect(within(tabs).getByRole('link', { name: 'Debts' })).toHaveAttribute('aria-current', 'page');
  expect(within(tabs).getByRole('link', { name: 'Family' })).toBeInTheDocument();
});


test('no tabs for a one-page section or for settings', () => {
  const { unmount } = renderShellAt('/dashboard');
  expect(screen.queryByRole('navigation', { name: /Pages in/ })).not.toBeInTheDocument();
  unmount();

  renderShellAt('/settings');
  expect(screen.queryByRole('navigation', { name: /Pages in/ })).not.toBeInTheDocument();
});


test('the menu button slides the sidebar in, and Escape closes it', async () => {
  const user = userEvent.setup();
  renderShellAt('/dashboard');

  const sidebar = screen.getByRole('complementary');
  expect(sidebar.className).toContain('-translate-x-full');

  await user.click(screen.getByRole('button', { name: 'Open menu' }));
  expect(sidebar.className).not.toContain('-translate-x-full');

  await user.keyboard('{Escape}');
  expect(sidebar.className).toContain('-translate-x-full');
});
