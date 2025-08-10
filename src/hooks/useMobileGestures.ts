import { useCallback, useEffect, useRef } from 'react';

export interface GestureHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onLongPress?: () => void;
  onDoubleTap?: () => void;
  onTap?: () => void;
}

export interface GestureOptions {
  /**
   * Minimum distance for swipe detection (px)
   * @default 50
   */
  swipeThreshold?: number;
  /**
   * Maximum time for swipe detection (ms)
   * @default 300
   */
  swipeTimeout?: number;
  /**
   * Long press duration (ms)
   * @default 500
   */
  longPressDelay?: number;
  /**
   * Double tap timeout (ms)
   * @default 300
   */
  doubleTapDelay?: number;
  /**
   * Prevent default touch behavior
   * @default false
   */
  preventDefault?: boolean;
}

interface TouchState {
  startX: number;
  startY: number;
  startTime: number;
  isLongPress: boolean;
  longPressTimer: number | null;
  lastTapTime: number;
  tapCount: number;
}

/**
 * Hook for handling mobile gestures (swipe, long press, double tap)
 */
export function useMobileGestures(
  handlers: GestureHandlers,
  options: GestureOptions = {}
) {
  const {
    swipeThreshold = 50,
    swipeTimeout = 300,
    longPressDelay = 500,
    doubleTapDelay = 300,
    preventDefault = false,
  } = options;

  const touchState = useRef<TouchState>({
    startX: 0,
    startY: 0,
    startTime: 0,
    isLongPress: false,
    longPressTimer: null,
    lastTapTime: 0,
    tapCount: 0,
  });

  const clearLongPressTimer = useCallback(() => {
    if (touchState.current.longPressTimer) {
      clearTimeout(touchState.current.longPressTimer);
      touchState.current.longPressTimer = null;
    }
  }, []);

  const handleTouchStart = useCallback(
    (event: TouchEvent) => {
      if (preventDefault) {
        event.preventDefault();
      }

      const touch = event.touches[0];
      if (!touch) return;
      
      const now = Date.now();

      touchState.current = {
        ...touchState.current,
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: now,
        isLongPress: false,
      };

      // Clear any existing long press timer
      clearLongPressTimer();

      // Start long press timer
      if (handlers.onLongPress) {
        touchState.current.longPressTimer = window.setTimeout(() => {
          touchState.current.isLongPress = true;
          handlers.onLongPress?.();
        }, longPressDelay);
      }
    },
    [handlers.onLongPress, longPressDelay, preventDefault, clearLongPressTimer]
  );

  const handleTouchMove = useCallback(
    (event: TouchEvent) => {
      if (preventDefault) {
        event.preventDefault();
      }

      // Cancel long press if finger moves too much
      const touch = event.touches[0];
      if (!touch) return;
      
      const deltaX = Math.abs(touch.clientX - touchState.current.startX);
      const deltaY = Math.abs(touch.clientY - touchState.current.startY);

      if (deltaX > 10 || deltaY > 10) {
        clearLongPressTimer();
      }
    },
    [preventDefault, clearLongPressTimer]
  );

  const handleTouchEnd = useCallback(
    (event: TouchEvent) => {
      if (preventDefault) {
        event.preventDefault();
      }

      const touch = event.changedTouches[0];
      if (!touch) return;
      
      const endTime = Date.now();
      const deltaTime = endTime - touchState.current.startTime;
      const deltaX = touch.clientX - touchState.current.startX;
      const deltaY = touch.clientY - touchState.current.startY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // Clear long press timer
      clearLongPressTimer();

      // If it was a long press, don't process other gestures
      if (touchState.current.isLongPress) {
        return;
      }

      // Check for swipe gestures
      if (distance >= swipeThreshold && deltaTime <= swipeTimeout) {
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);

        if (absX > absY) {
          // Horizontal swipe
          if (deltaX > 0) {
            handlers.onSwipeRight?.();
          } else {
            handlers.onSwipeLeft?.();
          }
        } else {
          // Vertical swipe
          if (deltaY > 0) {
            handlers.onSwipeDown?.();
          } else {
            handlers.onSwipeUp?.();
          }
        }
        return;
      }

      // Check for tap gestures (only if no significant movement)
      if (distance < 10) {
        const timeSinceLastTap = endTime - touchState.current.lastTapTime;

        if (timeSinceLastTap < doubleTapDelay) {
          // Double tap
          touchState.current.tapCount++;
          if (touchState.current.tapCount === 2) {
            handlers.onDoubleTap?.();
            touchState.current.tapCount = 0;
            touchState.current.lastTapTime = 0;
            return;
          }
        } else {
          // Reset tap count
          touchState.current.tapCount = 1;
        }

        touchState.current.lastTapTime = endTime;

        // Single tap (with delay to check for double tap)
        if (handlers.onTap && !handlers.onDoubleTap) {
          handlers.onTap();
        } else if (handlers.onTap) {
          window.setTimeout(() => {
            if (touchState.current.tapCount === 1) {
              handlers.onTap?.();
              touchState.current.tapCount = 0;
            }
          }, doubleTapDelay);
        }
      }
    },
    [
      handlers.onSwipeLeft,
      handlers.onSwipeRight,
      handlers.onSwipeUp,
      handlers.onSwipeDown,
      handlers.onTap,
      handlers.onDoubleTap,
      swipeThreshold,
      swipeTimeout,
      doubleTapDelay,
      preventDefault,
      clearLongPressTimer,
    ]
  );

  const attachGestures = useCallback(
    (element: HTMLElement | null) => {
      if (!element) return;

      element.addEventListener('touchstart', handleTouchStart, { passive: !preventDefault });
      element.addEventListener('touchmove', handleTouchMove, { passive: !preventDefault });
      element.addEventListener('touchend', handleTouchEnd, { passive: !preventDefault });

      return () => {
        element.removeEventListener('touchstart', handleTouchStart);
        element.removeEventListener('touchmove', handleTouchMove);
        element.removeEventListener('touchend', handleTouchEnd);
      };
    },
    [handleTouchStart, handleTouchMove, handleTouchEnd, preventDefault]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearLongPressTimer();
    };
  }, [clearLongPressTimer]);

  return { attachGestures };
}

/**
 * Hook for detecting device capabilities
 */
export function useDeviceCapabilities() {
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);
  const isMobile = isTouchDevice && (isIOS || isAndroid);

  return {
    isTouchDevice,
    isIOS,
    isAndroid,
    isMobile,
  };
}
