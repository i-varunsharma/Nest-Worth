import { useState } from 'react';
import { formatRupees } from '../../lib/plan';
import { relationLabel } from '../../lib/family';

/*
  One person on the family page.

  Props:
    member         - { name, relation, monthlySupport, hasHealthCover }
    shareOfIncome  - their support as a percentage of income, already rounded
    onEdit         - open the form for this person
    onDelete       - remove them
*/
export default function FamilyMemberCard({ member, shareOfIncome, onEdit, onDelete }) {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  let coverText = 'No health cover';
  let coverClasses = 'border-clay/25 bg-claySoft text-clay';

  if (member.hasHealthCover === true) {
    coverText = 'Health cover';
    coverClasses = 'border-accent/25 bg-accentSoft text-accentDeep';
  }

  let supportNote = shareOfIncome + '% of income';
  if (member.monthlySupport === 0) {
    supportNote = 'Nothing sent each month';
  }

  return (
    <div className="rounded-[22px] border border-line bg-surface p-5 shadow-card sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-display text-[22px] leading-tight">{member.name}</p>
          <p className="mt-1 text-[13px] text-muted">{relationLabel(member.relation)}</p>
        </div>

        <div className="text-right">
          <p className="tnum font-display text-[22px] leading-tight">{formatRupees(member.monthlySupport)}</p>
          <p className="mt-1 text-2xs text-muted">{supportNote}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-lineSoft pt-4">
        <span className={'rounded-full border px-2.5 py-1 text-2xs font-semibold uppercase tracking-widest2 ' + coverClasses}>
          {coverText}
        </span>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onEdit}
            className="sweep text-[13px] font-medium text-muted transition-colors hover:text-ink"
          >
            Edit
          </button>

          {/* Removing asks first, the same as on the debts page. */}
          {isConfirmingDelete === true ? (
            <>
              <button
                type="button"
                onClick={onDelete}
                className="text-[13px] font-semibold text-clay transition-colors hover:underline"
              >
                Really remove
              </button>
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(false)}
                className="text-[13px] font-medium text-muted transition-colors hover:text-ink"
              >
                Keep
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setIsConfirmingDelete(true)}
              className="sweep text-[13px] font-medium text-muted transition-colors hover:text-clay"
            >
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
