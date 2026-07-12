import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import type { HealthStatus } from '@/types/analysis';

export function useBackendHealth() {
  const [health, setHealth] = useState<HealthStatus | null>(null);

  useEffect(() => {
    let active = true;

    api
      .getHealth()
      .then((nextHealth) => {
        if (active) setHealth(nextHealth);
      })
      .catch(() => {
        if (active) setHealth(null);
      });

    return () => {
      active = false;
    };
  }, []);

  return health;
}
