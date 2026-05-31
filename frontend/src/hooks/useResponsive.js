/**
 * useResponsive Hook
 *
 * Provides responsive breakpoint detection for React components.
 * Automatically detects mobile, tablet, and desktop screen sizes.
 *
 * @returns {Object} Responsive state object
 */

import { useState, useEffect } from 'react';

const breakpoints = {
  mobile: 768,
  tablet: 1024
};

const useResponsive = () => {
  const [screenSize, setScreenSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768
  });

  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    // Check if we're on the client side
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      setScreenSize({ width, height });
      setIsMobile(width < breakpoints.mobile);
      setIsTablet(width >= breakpoints.mobile && width < breakpoints.tablet);
      setIsDesktop(width >= breakpoints.tablet);
    };

    // Initial check
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    screenSize,
    isMobile,
    isTablet,
    isDesktop,
    breakpoints
  };
};

export default useResponsive;
