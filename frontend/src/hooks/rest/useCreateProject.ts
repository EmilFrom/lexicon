import { MutationHookOptions, useMutation } from '@apollo/client';

import {
  CreateProjectDocument,
  CreateProjectMutationVariables,
  CreateProjectMutation as CreateProjectType,
} from '../../generatedAPI/server';
import { errorHandlerAlert } from '../../helpers';

export function useCreateProject(
  options?: MutationHookOptions<CreateProjectType, CreateProjectMutationVariables>,
) {
  const [createProject, { loading, error }] = useMutation<
    CreateProjectType,
    CreateProjectMutationVariables
  >(CreateProjectDocument, {
    ...options,
    onError: (error) => {
      errorHandlerAlert(error);
      options?.onError?.(error);
    },
  });

  return { createProject, loading, error };
}

