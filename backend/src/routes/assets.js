import { createRecordRouter } from './recordRoutes.js';
import { assetRepository } from '../repositories/assetRepository.js';
import { assetValues, checkAsset } from '../validation/records.js';

// /api/assets
export default createRecordRouter({
  repository: assetRepository,
  check: checkAsset,
  toValues: assetValues,
  singular: 'asset',
  plural: 'assets',
  notFoundMessage: 'No such asset.',
});
