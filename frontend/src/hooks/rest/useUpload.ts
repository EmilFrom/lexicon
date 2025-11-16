import { MutationHookOptions, useMutation } from '@apollo/client';
import { useState } from 'react';

import {
  UploadDocument,
  UploadMutationVariables,
  UploadMutation as UploadType,
} from '../../generatedAPI/server';
import { errorHandlerAlert, formatImageLink } from '../../helpers';
import { Image } from '../../types';

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
  options?: MutationHookOptions<UploadType, UploadMutationVariables>,
) {
  const [completedToken, setCompletedToken] = useState(0);
  const [tempArray, setTempArray] = useState<Array<Image>>(initialImages);

  const [uploadMutation] = useMutation<UploadType, UploadMutationVariables>(
    UploadDocument,
    {
      ...options,
      onCompleted: (data) => {
        const result = data.upload;
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
        setTempArray((prev) => {
          const updatedArray = [...prev];
          if (updatedArray[token - 1]) {
            updatedArray[token - 1] = { link: imageUrl, done: true };
          }
          return updatedArray;
        });
        setCompletedToken(token);
        options?.onCompleted?.(data);
      },
    },
  );

  const upload = (
    uploadOptions: MutationHookOptions<UploadType, UploadMutationVariables>,
  ) => {
    const token = uploadOptions.variables?.input.token;
    return uploadMutation({
      ...uploadOptions,
      onError: (error) => {
        if (token) {
          setTempArray((prev) => {
            const updatedArray = [...prev];
            if (updatedArray[token - 1]) {
              updatedArray[token - 1] = { link: '', done: true };
            }
            return updatedArray;
          });
        }
        errorHandlerAlert(error);
        options?.onError?.(error);
      },
    });
  };

  return { upload, tempArray, setTempArray, completedToken };
}
