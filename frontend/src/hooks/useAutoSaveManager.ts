import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';

import { draftSaveManager } from '../constants';

/**
 * This hook handle to make sure auto save draft canSave value to false when navigate
 */

type inputHookAutoSaveManager = {
  debounceSaveDraft: {
    (): void; // This means it can be called like a function
    cancel: () => void; // This means it also has a .cancel() method
  };
};
export function useAutoSaveManager({
  debounceSaveDraft,
}: inputHookAutoSaveManager) {
  useFocusEffect(
    useCallback(() => {
      draftSaveManager.canStartAutoSaving();

      return () => {
        draftSaveManager.disableCanStartAutoSaving();
        debounceSaveDraft.cancel();
      };
    }, [debounceSaveDraft]),
  );
}
