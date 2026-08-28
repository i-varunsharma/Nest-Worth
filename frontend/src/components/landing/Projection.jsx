import { useMemo, useState } from 'react';
import Container from '../shared/Container';
import Eyebrow from '../shared/Eyebrow';
import Reveal from '../shared/Reveal';
import useCountUp from '../../hooks/useCountUp';
import useReveal from '../../hooks/useReveal';
import { buildPlan, formatRupees, projectionSeries } from '../../lib/plan';

const horizons = [10, 15, 20, 25];
const W = 560;
const H = 240;

export default function Projection({ state }) {
  const [years, setYears] = useState(15);
  const [ref, isIn] = useReveal({ threshold: 0.3 });

  const plan = useMemo(() => buildPlan(state), [state]);
  const monthly = plan.buckets.find((bucket) => bucket.key === 'invest')?.amount ?? 0;
  const series = useMemo(() => projectionSeries(monthly, years), [monthly, years]);

  const peak = series[series.length - 1]?.value || 1;
  const toPoint = (item, key) => {
    const x = (item.year / years) * W;
    const y = H - (item[key] / peak) * (H - 12);
    return [x, y];
  };
  const line = (key) => series.map((item, index) => `${index === 0 ? 'M' : 'L'}${toPoint(item, key).join(' ')}`).join(' ');
  const area = `${line('value')} L${W} ${H} L0 ${H} Z`;

  const finalValue = useCountUp(series[series.length - 1]?.value ?? 0, { duration: 900, active: isIn });
  const investedTotal = monthly * 12 * years;
  const gain = (series[series.length - 1]?.value ?? 0) - investedTotal;

  return (
    <section id="future" className="border-y border-line bg-paperDeep">
      <Container className="py-24 lg:py-32">
        <div className="grid gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:gap-20">
          <div>
            <Reveal><Eyebrow>Future you</Eyebrow></Reveal>
            <Reveal delay={80}>
              <h2 className="mt-6 font-display text-[clamp(2.1rem,4vw,3.1rem)] leading-[1.06] tracking-[-0.02em]">
                What the boring decision is worth.
              </h2>
            </Reveal>
            <Reveal delay={150}>
              <p className="mt-6 max-w-sm text-[16px] leading-relaxed text-ink2">
                The {formatRupees(monthly)} a month your plan sends to index funds is the least
                dramatic line in it. Left alone, it is also the one that changes your life.
              </p>
            </Reveal>

            <Reveal delay={210}>
              <div className="mt-10">
                <p className="text-2xs font-semibold uppercase tracking-widest2 text-muted">In {years} years</p>
                <p className="tnum mt-2 font-display text-[clamp(2.8rem,6vw,4rem)] leading-none text-accent">
                  {formatRupees(finalValue, { compact: true })}
                </p>
                <p className="mt-3 text-[13.5px] text-ink2">
                  <span className="tnum font-semibold">{formatRupees(investedTotal, { compact: true })}</span> invested,
                  <span className="tnum font-semibold text-brass"> {formatRupees(gain, { compact: true })}</span> earned while you did nothing.
                </p>
              </div>
            </Reveal>

            <Reveal delay={270}>
              <div className="mt-8 inline-flex gap-1 rounded-full border border-line bg-surface p-1">
                {horizons.map((horizon) => (
                  <button
                    key={horizon}
                    type="button"
                    onClick={() => setYears(horizon)}
                    aria-pressed={years === horizon}
                    className={`rounded-full px-4 py-2 text-[13px] font-semibold transition-all duration-300 ease-smooth ${
                      years === horizon ? 'bg-ink text-paper' : 'text-muted hover:text-ink'
                    }`}
                  >
                    {horizon}y
                  </button>
                ))}
              </div>
            </Reveal>
          </div>

          <Reveal delay={120}>
            <div ref={ref} className="rounded-[26px] border border-line bg-surface p-6 shadow-card sm:p-8">
              <div className="flex items-center justify-between">
                <p className="text-2xs font-semibold uppercase tracking-widest2 text-muted">Projected corpus</p>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5 text-2xs text-muted"><span className="h-1.5 w-1.5 rounded-full bg-accent" />Value</span>
                  <span className="flex items-center gap-1.5 text-2xs text-muted"><span className="h-1.5 w-1.5 rounded-full bg-line" />Invested</span>
                </div>
              </div>

              <svg viewBox={`0 0 ${W} ${H}`} className="mt-6 h-auto w-full overflow-visible" role="img" aria-label={`Projected corpus after ${years} years`}>
                <defs>
                  <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1F5340" stopOpacity="0.20" />
                    <stop offset="100%" stopColor="#1F5340" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
                  <line key={tick} x1="0" x2={W} y1={H - tick * (H - 12)} y2={H - tick * (H - 12)} stroke="#EEE8DE" strokeWidth="1" />
                ))}

                <path d={area} fill="url(#areaFill)" style={{ opacity: isIn ? 1 : 0, transition: 'opacity 900ms ease-out 400ms' }} />
                <path
                  d={line('invested')}
                  fill="none"
                  stroke="#D6CCBE"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                  style={{ opacity: isIn ? 1 : 0, transition: 'opacity 700ms ease-out 500ms' }}
                />
                <path
                  d={line('value')}
                  fill="none"
                  stroke="#1F5340"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  pathLength="1"
                  style={{
                    strokeDasharray: 1,
                    strokeDashoffset: isIn ? 0 : 1,
                    transition: 'stroke-dashoffset 1400ms cubic-bezier(0.22,1,0.36,1) 200ms',
                  }}
                />
                <circle
                  cx={W}
                  cy={12}
                  r="5"
                  fill="#1F5340"
                  style={{ opacity: isIn ? 1 : 0, transition: 'opacity 400ms ease-out 1400ms' }}
                />
              </svg>

              <div className="mt-5 flex justify-between border-t border-lineSoft pt-4 text-2xs text-muted">
                <span>Today</span>
                <span className="tnum">Year {Math.round(years / 2)}</span>
                <span className="tnum">Year {years}</span>
              </div>
              <p className="mt-4 text-2xs leading-relaxed text-muted">
                Assumes an 11% annual return, compounded monthly, with no step-up.
                Markets do not move in smooth curves — this shows the shape of the decision, not a promise.
              </p>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
