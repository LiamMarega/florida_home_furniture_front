'use client';

import { useEffect, useState } from 'react';
import { useScrollAnimation } from './use-scroll-animation';

interface UseCounterAnimationOptions {
  end: number;
  duration?: number;
  startDelay?: number;
}

export function useCounterAnimation({
  end,
  duration = 2000,
  startDelay = 0
}: UseCounterAnimationOptions) {
  const [count, setCount] = useState(0);
  const { ref, isVisible } = useScrollAnimation();

  useEffect(() => {
    if (!isVisible) return;

    const timeout = setTimeout(() => {
      const startTime = Date.now();
      const endTime = startTime + duration;

      const updateCount = () => {
        const now = Date.now();
        const remaining = endTime - now;

        if (remaining <= 0) {
          setCount(end);
          return;
        }

        const progress = 1 - remaining / duration;
        const currentCount = Math.floor(progress * end);
        setCount(currentCount);

        requestAnimationFrame(updateCount);
      };

      requestAnimationFrame(updateCount);
    }, startDelay);

    return () => clearTimeout(timeout);
  }, [isVisible, end, duration, startDelay]);

  return { ref, count };
}
