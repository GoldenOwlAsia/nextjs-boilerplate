import { type FieldValues, type Path, type UseFormSetError } from 'react-hook-form';

import { ApiError } from '@/shared/lib/api';

/**
 * Bridges server-side validation back into the form.
 *
 * Client-side zod schemas catch shape errors; only the backend knows that an
 * email is already taken. `ApiError.details` carries those field errors, and
 * without something like this they end up as a generic toast that tells the user
 * nothing about which input to fix.
 *
 * Returns `true` when the error was field-level and has been displayed, so the
 * caller knows whether it still needs to surface a general message:
 *
 * ```ts
 * onError: (error) => {
 *   if (!applyApiErrorToForm(error, form.setError)) toast.error('Something went wrong');
 * }
 * ```
 */
export const applyApiErrorToForm = <T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
): boolean => {
  if (!(error instanceof ApiError) || !error.details) return false;

  const entries = Object.entries(error.details);

  if (entries.length === 0) return false;

  entries.forEach(([field, messages], index) => {
    const message = messages[0];

    if (!message) return;

    setError(
      field as Path<T>,
      { type: 'server', message },
      // Focus the first offending input, the way a native form submit would.
      { shouldFocus: index === 0 },
    );
  });

  return true;
};
