import { Link } from 'react-router-dom';
import Container from '../shared/Container';

const columns = [
  { title: 'Product', items: [{ label: 'How it works', href: '#how' }, { label: 'Why Nestworth', href: '#difference' }, { label: 'Your projection', href: '#future' }, { label: 'Questions', href: '#questions' }] },
  { title: 'Company', items: [{ label: 'About', href: '#' }, { label: 'Notes', href: '#' }, { label: 'Contact', href: '#' }] },
  { title: 'Legal', items: [{ label: 'Privacy', href: '#' }, { label: 'Terms', href: '#' }, { label: 'Disclosure', href: '#questions' }] },
];

export default function Footer() {
  return (
    <footer className="border-t border-line bg-paper">
      <Container className="py-16">
        <div className="grid gap-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Link to="/" className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-ink text-[13px] font-bold text-paper">N</span>
              <span className="font-display text-[21px] leading-none tracking-tight">Nestworth</span>
            </Link>
            <p className="mt-4 max-w-xs text-[13.5px] leading-relaxed text-muted">
              A finance tool that reads your household before it reads your salary.
            </p>
          </div>

          {columns.map((column) => (
            <div key={column.title}>
              <h4 className="text-2xs font-semibold uppercase tracking-widest2 text-muted">{column.title}</h4>
              <ul className="mt-4 space-y-2.5">
                {column.items.map((item) => (
                  <li key={item.label}>
                    <a href={item.href} className="sweep text-[13.5px] text-ink2 transition-colors hover:text-ink">{item.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-line pt-7 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12.5px] text-muted">&copy; {new Date().getFullYear()} Nestworth. Built with care for how Indian households actually share money.</p>
          <p className="text-[12.5px] text-muted">Educational guidance, not regulated investment advice.</p>
        </div>
      </Container>
    </footer>
  );
}
