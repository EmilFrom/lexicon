import { MutationHookOptions } from '@apollo/client';
import { useState } from 'react';

import {
  UploadDocument,
  UploadMutationVariables,
  UploadMutation as UploadType,
} from '../../generatedAPI/server';
import { errorHandlerAlert, formatImageLink } from '../../helpers';
import { Image } from '../../types';
import { useMutation } from '../../utils';

export function useStatelessUpload(
  options?: MutationHookOptions<UploadType, UploadMutationVariables>,
) {
  const [upload, { loading }] = useMutation<
    UploadType,
    UploadMutationVariables
  >(UploadDocument, {
    ...options,
  });
  return { upload, loading };
}

export function useStatefulUpload(
  initialImages: Array<Image>,
  currentToken: number,
  options?: MutationHookOptions<UploadType, UploadMutationVariables>,
) {
  const [completedToken, setCompletedToken] = useState(1);
  const [tempArray, setTempArray] = useState<Array<Image>>(initialImages);

  const [upload] = useMutation<UploadType, UploadMutationVariables>(
    UploadDocument,
    {
      ...options,
      onCompleted: ({ upload: result }) => {
        const {
          originalFilename: name,
          width,
          height,
          shortUrl: url,
          token,
        } = result;
        if (!token) {
          return;
        }

        const imageUrl = formatImageLink(name, width, height, url);
        // Clone the existing array instead of mutating it so React can detect the change.
        setTempArray((prev) => {
          const updatedArray = [...prev];
          updatedArray[token - 1] = { link: imageUrl, done: true };
          return updatedArray;
        });
        setCompletedToken(token);
      },
      onError: (error) => {
        setTempArray((prev) => {
          const updatedArray = [...prev];
          updatedArray[currentToken - 2] = { link: '', done: true };
          return updatedArray;
        });
        errorHandlerAlert(error);
      },
    },
  );

  return { upload, tempArray, setTempArray, completedToken };
}
