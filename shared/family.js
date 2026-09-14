/*
  The people a salary supports.

  A family member here is:
    { id, name, relation, monthlySupport, hasHealthCover }

  Lives in shared/ because the browser draws the family page with it and the
  server hands it to the AI coach. One copy means both count the same people.
*/


// Who someone can be. Stored as the value, shown as the label.
export const RELATIONS = [
  { value: 'parent', label: 'Parent' },
  { value: 'spouse', label: 'Spouse or partner' },
  { value: 'child', label: 'Child' },
  { value: 'sibling', label: 'Brother or sister' },
  { value: 'grandparent', label: 'Grandparent' },
  { value: 'other', label: 'Someone else' },
];

// The highest monthly support the API accepts for one person. Anything above
// this is almost always a typo with an extra zero.
export const MAX_MONTHLY_SUPPORT = 10000000;


/* The label for a stored relation, or "Someone else" for anything unknown. */
export function relationLabel(value) {
  for (const relation of RELATIONS) {
    if (relation.value === value) {
      return relation.label;
    }
  }

  return 'Someone else';
}


/*
  Adds the family up.

  hasList is false when nobody has been added yet. The plan uses that to decide
  between the real total and the old estimate, so an empty list and a list of
  people who get nothing each month are not treated the same.
*/
export function summariseFamily(members) {
  let totalSupport = 0;
  const withoutCover = [];

  members.forEach((member) => {
    totalSupport = totalSupport + member.monthlySupport;

    if (member.hasHealthCover !== true) {
      withoutCover.push(member);
    }
  });

  return {
    hasList: members.length > 0,
    count: members.length,
    totalSupport: totalSupport,
    withoutCover: withoutCover,
  };
}


/*
  Checks one family member. Returns an error message, or an empty string.

  Shared so the form and the API refuse exactly the same things. The API still
  runs it itself, because anybody can post to it without using the form.
*/
export function checkFamilyMember(body) {
  if (!body || typeof body.name !== 'string' || body.name.trim().length === 0) {
    return 'Give this person a name.';
  }
  if (body.name.trim().length > 40) {
    return 'That name is too long.';
  }

  let knownRelation = false;
  for (const relation of RELATIONS) {
    if (relation.value === body.relation) {
      knownRelation = true;
    }
  }

  if (knownRelation === false) {
    return 'Pick how you are related.';
  }

  // Numbers typed into a form can arrive as text, so convert before checking.
  const monthlySupport = Number(body.monthlySupport);

  if (!Number.isFinite(monthlySupport) || monthlySupport < 0 || monthlySupport > MAX_MONTHLY_SUPPORT) {
    return 'That monthly amount does not look right.';
  }

  // A real true or false. The string "false" would otherwise count as true.
  if (typeof body.hasHealthCover !== 'boolean') {
    return 'Say whether they have health cover.';
  }

  return '';
}
