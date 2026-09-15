/*
  How the signed-in app is organised. Every feature belongs to one section.

  The sidebar shows only the section headings. Inside a section, its pages are
  shown as tabs at the top of the page. Both read this list, so moving a page to
  another section is a change here and nowhere else.

  The first page in each section is where its sidebar heading goes.
*/

export const SECTIONS = [
  {
    key: 'overview',
    label: 'Overview',
    pages: [
      { to: '/dashboard', label: 'Dashboard' },
    ],
  },
  {
    // Deciding what to do with the money, and checking the plan holds up.
    key: 'plan',
    label: 'Plan',
    pages: [
      { to: '/plans', label: 'Plans' },
      { to: '/goals', label: 'Goals' },
      { to: '/stress-test', label: 'Stress test' },
    ],
  },
  {
    // What you own, what you owe, and who your salary supports.
    key: 'money',
    label: 'Your money',
    pages: [
      { to: '/net-worth', label: 'Net worth' },
      { to: '/debts', label: 'Debts' },
      { to: '/family', label: 'Family' },
    ],
  },
  {
    // What actually happened, month by month and over the year.
    key: 'track',
    label: 'Track',
    pages: [
      { to: '/spending', label: 'Spending' },
      { to: '/check-in', label: 'Check in' },
      { to: '/recap', label: 'Your year' },
    ],
  },
];

// Settings is not a feature section, so it sits apart at the bottom of the sidebar.
export const SETTINGS_PATH = '/settings';

/*
  The section a page address belongs to, or null if it is in none of them
  (Settings, for example).
*/
export function findSection(pathname) {
  for (const section of SECTIONS) {
    for (const page of section.pages) {
      if (page.to === pathname) {
        return section;
      }
    }
  }

  return null;
}
