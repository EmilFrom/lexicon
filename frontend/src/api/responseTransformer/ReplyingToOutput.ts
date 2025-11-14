/**
 * Transforms the response data for a reply post by extracting the first reply
 * from an array and returning it as an object.
 *
 */

export const replyingToOutputResponseTransform = (
  data: Array<{ id: string }>,
) => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return null;
  }
  return data[0];
};
