import { useEffect } from 'react';
import { beforeContentLeave } from '../../utils/unsavedChanges';
export function useUnsavedChanges(dirty: boolean, onChange: (dirty: boolean) => void) {
  useEffect(() => {
    onChange(dirty);
    return () => onChange(false);
  }, [dirty, onChange]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    const guard = (event: Event) => {
      if (dirty) event.preventDefault();
    };
    window.addEventListener(beforeContentLeave, guard);
    window.addEventListener('beforeunload', warn);
    return () => {
      window.removeEventListener('beforeunload', warn);
      window.removeEventListener(beforeContentLeave, guard);
    };
  }, [dirty]);
}
