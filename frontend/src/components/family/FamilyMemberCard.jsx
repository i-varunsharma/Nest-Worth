import Card from '../shared/Card';
import RecordActions from '../shared/RecordActions';
import { formatRupees } from '../../lib/plan';
import { relationLabel } from '../../lib/family';

/*
  One person on the family page.

  Props:
    member         { name, relation, monthlySupport, hasHealthCover }
    shareOfIncome  their support as a whole-number percentage of income
    onEdit, onDelete
*/
export default function FamilyMemberCard({ member, shareOfIncome, onEdit, onDelete }) {
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
    <Card>
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

        <RecordActions onEdit={onEdit} onDelete={onDelete} deleteLabel="Remove" />
      </div>
    </Card>
  );
}
