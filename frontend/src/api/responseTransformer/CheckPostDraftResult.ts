import { Apollo } from '../../types';
import { CheckDraft } from '../../types/api';

import { transformDraftData } from './helper';

/**
 * Transforms response data from:
 *
 * ```
 * {
 *   draft: { ...dataDraft },
 *   draft_sequence: number
 * }
 * ```
 *
 * into:
 *
 * ```
 * {
 *   draft: { ...dataDraft, __typename: string },
 *   sequence: number
 * }
 * ```
 *
 */

export const checkPostDraftResultResponseTransformer = async (
  data: CheckDraft,
  _: string,
  client: Apollo,
) => {
  // If there is no data or no draft data, return an empty draft response.
  if (!data) {
    return { draft: null, sequence: 0 };
  }
  
  if (!data.draft) {
    return { draft: null, sequence: data.draft_sequence };
  }

  const newDraftData = await transformDraftData(data.draft, client);

  return {
    draft: newDraftData,
    sequence: data.draft_sequence,
  };
};
