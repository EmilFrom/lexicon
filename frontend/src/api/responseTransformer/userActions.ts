/**
 * Transforms the response data for user activity by extracting the `user_actions` array.
 *
 * The input data is in the following format:
 * {
 *   user_actions: [ // array of user actions data ]
 * }
 *
 * This function converts it into:
 * [ // array of user actions data ]
 *
 * @param {Object} data - The response data containing the `user_actions` field.
 * @returns {Array<UserActions>} - The transformed array of user actions.
 */

import { UserActions } from '../../generatedAPI/server';

export const userActionsResponseTransform = (data: {
  user_actions?: Array<UserActions>; // <-- Make the property optional
}) => {
  // --- THIS IS THE FIX ---
  // Add a guard clause. If the data is falsy, or if the user_actions
  // property does not exist, return an empty array as a safe fallback.
  if (!data || !data.user_actions) {
    return []; // Return an empty array instead of crashing
  }
  // --- END OF FIX ---

  // If we get here, we know data.user_actions is a valid array.
  return data.user_actions;
};