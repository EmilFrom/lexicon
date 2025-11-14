import { RestLink } from 'apollo-link-rest';
import { getNormalizedUrlTemplate } from '../discourse-apollo-rest/utils';

export const profileOutputPatcher: RestLink.FunctionalTypePatcher = (data) => {
  // --- THIS IS THE FIX ---
  // Add a guard clause to check if the data is valid and has a 'user' property.
  if (!data || !data.user) {
    // If the data is not in the expected shape (e.g., it's an error object),
    // return it immediately without trying to patch it.
    return data;
  }
  // --- END OF FIX ---

  // If we get past the guard clause, we know `data.user` exists and is safe to use.
  data.user = {
    __typename: 'UserDetail',
    ...data.user,
    avatarTemplate: getNormalizedUrlTemplate({ instance: data.user }),
  };

  return data;
};
