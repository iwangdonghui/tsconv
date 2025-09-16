// Custom hook for animations
import { useEffect, useState } from 'react';

export function useAnimation(trigger: boolean, duration = 300) {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (trigger) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), duration);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [trigger, duration]);

  return isAnimating;
}

// Stagger animation hook
export function useStaggerAnimation(items: unknown[], delay = 50) {
  const [visibleItems, setVisibleItems] = useState<number[]>([]);

  useEffect(() => {
    setVisibleItems([]);
    const timers: ReturnType<typeof setTimeout>[] = [];

    items.forEach((_, index) => {
      const timer = setTimeout(() => {
        setVisibleItems(prev => [...prev, index]);
      }, index * delay);
      timers.push(timer);
    });

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [items, delay]);

  return visibleItems;
}

// Number animation hook
export function useCountAnimation(end: number, duration = 1000) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);

      setCount(Math.floor(end * progress));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [end, duration]);

  return count;
}

// Pulse animation for live updates
export function usePulse(isActive: boolean) {
  const [isPulsing, setIsPulsing] = useState(false);

  useEffect(() => {
    if (isActive) {
      const interval = setInterval(() => {
        setIsPulsing(true);
        setTimeout(() => setIsPulsing(false), 600);
      }, 2000);

      return () => clearInterval(interval);
    }
    return undefined;
  }, [isActive]);

  return isPulsing;
}
