import { Reference } from '@apollo/client';

export function handleDuplicateRef<T extends Reference>(
  firstArray: Array<T> | null,
  secondArray: Array<T> | null,
): Array<T> {
  if (!secondArray || !firstArray) {
    return secondArray || firstArray || [];
  }

  // /* --- CHANGED: Optimized with Set --- */
  const firstArrayIds = new Set(firstArray.map(({ __ref }) => __ref));
  const filteredSecondArray = secondArray.filter(
    (item) => !firstArrayIds.has(item.__ref),
  );
  // /* ---------------------------------- */

  return [...firstArray, ...filteredSecondArray];
}

export function handleDuplicates<T extends Reference>(params: {
  newArray: Readonly<Array<T>> | null;
  oldArray: Readonly<Array<T>> | null;
  newArrayIs: 'prepended' | 'appended';
}) {
  const { newArray, oldArray, newArrayIs } = params;

  // /* --- CHANGED: Safety Checks --- */
  if (!oldArray || oldArray.length === 0) return newArray || [];
  if (!newArray || newArray.length === 0) return oldArray || [];
  // /* ----------------------------- */

  // /* --- CHANGED: Use Set for lookup --- */
  const newArrayIds = new Set(newArray.map(({ __ref }) => __ref));

  const filteredOldArray = oldArray.filter((item) => {
    return !newArrayIds.has(item.__ref);
  });
  // /* ---------------------------------- */

  if (newArrayIs === 'prepended') {
    return [...newArray, ...filteredOldArray];
  } else {
    return [...filteredOldArray, ...newArray];
  }
}