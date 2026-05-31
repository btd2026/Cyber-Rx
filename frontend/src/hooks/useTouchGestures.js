/**
 * useTouchGestures Hook
 *
 * Provides touch gesture detection for mobile interactions.
 * Supports swipe left, swipe right, pull-to-refresh, and long-press.
 *
 * @param {Object} callbacks - Gesture callback functions
 * @returns {Object} Gesture handlers and ref
 */

import { useEffect, useRef, useState } from 'react';

const useTouchGestures = ({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  onPullToRefresh,
  onLongPress,
  longPressDelay = 500
}) => {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const touchStart = useRef(null);
  const touchStartY = useRef(null);
  const longPressTimer = useRef(null);
  const elementRef = useRef(null);

  // Touch start handler
  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    touchStart.current = touch.clientX;
    touchStartY.current = touch.clientY;

    // Start long press timer
    if (onLongPress) {
      longPressTimer.current = setTimeout(() => {
        onLongPress(e);
      }, longPressDelay);
    }
  };

  // Touch move handler
  const handleTouchMove = (e) => {
    if (!touchStart.current || !touchStartY.current) return;

    const touch = e.touches[0];
    const diffX = touchStart.current - touch.clientX;
    const diffY = touchStartY.current - touch.clientY;

    // Cancel long press if moved
    if (longPressTimer.current && (Math.abs(diffX) > 10 || Math.abs(diffY) > 10)) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    // Handle pull-to-refresh
    if (onPullToRefresh && window.scrollY === 0 && diffY < -50) {
      setIsPulling(true);
      setPullDistance(Math.min(Math.abs(diffY) - 50, 100));
    }
  };

  // Touch end handler
  const handleTouchEnd = (e) => {
    // Cancel long press timer
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    // Handle pull-to-refresh
    if (isPulling && pullDistance > 80) {
      onPullToRefresh();
      setIsPulling(false);
      setPullDistance(0);
      return;
    }

    setIsPulling(false);
    setPullDistance(0);

    if (!touchStart.current || !touchStartY.current) return;

    const touch = e.changedTouches[0];
    const diffX = touchStart.current - touch.clientX;
    const diffY = touchStartY.current - touch.clientY;
    const threshold = 50; // Minimum swipe distance

    // Determine if horizontal or vertical swipe
    if (Math.abs(diffX) > Math.abs(diffY)) {
      // Horizontal swipe
      if (Math.abs(diffX) > threshold) {
        if (diffX > 0) {
          onSwipeLeft?.(e);
        } else {
          onSwipeRight?.(e);
        }
      }
    } else {
      // Vertical swipe
      if (Math.abs(diffY) > threshold) {
        if (diffY > 0) {
          onSwipeUp?.(e);
        } else {
          onSwipeDown?.(e);
        }
      }
    }

    // Reset touch start
    touchStart.current = null;
    touchStartY.current = null;
  };

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: true });
    element.addEventListener('touchend', handleTouchEnd);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, onPullToRefresh, onLongPress, isPulling, pullDistance]);

  return {
    touchGesturesRef: elementRef,
    isPulling,
    pullDistance
  };
};

export default useTouchGestures;
