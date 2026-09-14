import { createRecordRouter } from './recordRoutes.js';
import { familyRepository } from '../repositories/familyRepository.js';
import { familyMemberValues } from '../validation/records.js';
import { checkFamilyMember } from '../../../shared/family.js';

// Enough for a large joint family. More than this is a script, not a person.
const MAX_FAMILY_MEMBERS = 30;

// /api/family
export default createRecordRouter({
  repository: familyRepository,
  check: checkFamilyMember,
  toValues: familyMemberValues,
  singular: 'member',
  plural: 'family',
  notFoundMessage: 'No such person.',
  maxRecords: MAX_FAMILY_MEMBERS,
});
