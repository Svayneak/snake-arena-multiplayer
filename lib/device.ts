/**
 * Device Checker & Touch Capability Detector
 * Detects device hardware, input capabilities, screen metrics and orientation.
 */

export interface DeviceInfo {
  isTouch: boolean;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  orientation: 'portrait' | 'landscape';
  pixelRatio: number;
  maxTouchPoints: number;
  hasCoarsePointer: boolean;
  userAgent: string;
}

export function detectDevice(): DeviceInfo {
  if (typeof window === 'undefined') {
    return {
      isTouch: false,
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      deviceType: 'desktop',
      orientation: 'landscape',
      pixelRatio: 1,
      maxTouchPoints: 0,
      hasCoarsePointer: false,
      userAgent: ''
    };
  }

  const ua = navigator.userAgent || '';
  const maxTouchPoints = navigator.maxTouchPoints || 0;
  const isTouch = ('ontouchstart' in window) || maxTouchPoints > 0;

  // Media query pointer check
  const hasCoarsePointer = window.matchMedia ? window.matchMedia('(pointer: coarse)').matches : false;

  // Regex checks for mobile and tablet
  const mobileRegex = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i;
  const tabletRegex = /iPad|Android(?!.*Mobile)|Tablet|PlayBook|Silk/i;

  const isMobileUa = mobileRegex.test(ua);
  const isTabletUa = tabletRegex.test(ua);
  const isSmallScreen = window.innerWidth <= 768;

  let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop';
  let isMobile = false;
  let isTablet = false;

  if (isTabletUa || (isTouch && window.innerWidth > 768 && window.innerWidth <= 1024)) {
    deviceType = 'tablet';
    isTablet = true;
  } else if (isMobileUa || (isTouch && isSmallScreen) || hasCoarsePointer) {
    deviceType = 'mobile';
    isMobile = true;
  } else {
    deviceType = 'desktop';
  }

  const orientation = window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
  const pixelRatio = window.devicePixelRatio || 1;

  return {
    isTouch,
    isMobile,
    isTablet,
    isDesktop: !isMobile && !isTablet,
    deviceType,
    orientation,
    pixelRatio,
    maxTouchPoints,
    hasCoarsePointer,
    userAgent: ua
  };
}
