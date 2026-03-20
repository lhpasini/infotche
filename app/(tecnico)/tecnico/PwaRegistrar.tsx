'use client';

import { useEffect } from 'react';

export function PwaRegistrar() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.error('Falha ao registrar o service worker do tecnico:', error);
    });
  }, []);

  return null;
}
