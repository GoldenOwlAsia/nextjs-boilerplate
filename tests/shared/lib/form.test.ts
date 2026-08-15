import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/shared/lib/api';
import { applyApiErrorToForm } from '@/shared/lib/form';

type Fields = { email: string; password: string };

describe('applyApiErrorToForm', () => {
  it('maps field errors onto the form and focuses the first one', () => {
    const setError = vi.fn();
    const error = new ApiError({
      status: 422,
      message: 'Validation failed',
      details: { email: ['is already taken'], password: ['is too short'] },
    });

    expect(applyApiErrorToForm<Fields>(error, setError)).toBe(true);
    expect(setError).toHaveBeenCalledWith(
      'email',
      { type: 'server', message: 'is already taken' },
      { shouldFocus: true },
    );
    expect(setError).toHaveBeenCalledWith(
      'password',
      { type: 'server', message: 'is too short' },
      { shouldFocus: false },
    );
  });

  it('reports handled=false for errors with no field detail, so the caller can show a toast', () => {
    const setError = vi.fn();

    expect(applyApiErrorToForm<Fields>(new Error('boom'), setError)).toBe(false);
    expect(
      applyApiErrorToForm<Fields>(new ApiError({ status: 500, message: 'Server error' }), setError),
    ).toBe(false);
    expect(
      applyApiErrorToForm<Fields>(
        new ApiError({ status: 422, message: 'Invalid', details: {} }),
        setError,
      ),
    ).toBe(false);
    expect(setError).not.toHaveBeenCalled();
  });
});
