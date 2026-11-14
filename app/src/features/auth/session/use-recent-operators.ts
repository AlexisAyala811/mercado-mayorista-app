import { useEffect, useState } from 'react';

import type { RecentOperator } from '@/domain/auth/recent-operators';
import { readRecentOperators } from '@/services/storage/recent-operators-storage';

// Spec 011 (RQ-ST12, CL-ST16): operators that already signed in on this tablet.
export function useRecentOperators() {
  const [operators, setOperators] = useState<RecentOperator[]>([]);
  useEffect(() => {
    let active = true;
    void readRecentOperators().then((list) => {
      if (active) setOperators(list);
    });
    return () => {
      active = false;
    };
  }, []);
  return operators;
}
