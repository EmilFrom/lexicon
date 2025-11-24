import { LazyQueryHookOptions } from '@apollo/client';

import {
  AboutDocument,
  AboutQuery as AboutType,
} from '../../../generatedAPI/server';
import { ErrorAlertOptionType } from '../../../types';
import { useLazyQuery } from '../../../utils';

export function useAbout(
  options?: LazyQueryHookOptions<AboutType>,
  errorAlert: ErrorAlertOptionType = 'SHOW_ALERT',
) {
  // Capture data
  const [getAbout, { error, data }] = useLazyQuery<AboutType>(
    AboutDocument,
    {
      ...options,
    },
    errorAlert,
  );

  return { getAbout, error, data }; // Return data
}
