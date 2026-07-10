// Test stand-in for virtual:pwa-register/react (aliased in vite.config.ts `test`).
import { useState } from 'react';
import { vi } from 'vitest';

export const updateServiceWorker = vi.fn(async (_reload?: boolean) => {});

// Tests set this before render to simulate an available update.
export const mockInitialState = { needRefresh: false, offlineReady: false };

export function useRegisterSW() {
  const needRefresh = useState(mockInitialState.needRefresh);
  const offlineReady = useState(mockInitialState.offlineReady);
  return { needRefresh, offlineReady, updateServiceWorker };
}
