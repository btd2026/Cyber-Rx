/**
 * Shared Design Constants
 *
 * Centralized design tokens for colors, spacing, and typography.
 * Used across all components for consistency.
 */

// Theme colors
export const COLORS = {
  bg: '#F8FAFC',
  panel: '#FFFFFF',
  card: '#FFFFFF',
  border: '#E2E8F0',
  accent: '#0891B2',
  accentFaint: '#0891B210',
  text: '#0F172A',
  muted: '#64748B',
  dim: '#F1F5F9',

  // Semantic colors
  critical: '#EF4545',
  high: '#F5A623',
  medium: '#3B9EFF',
  low: '#0FBB80',
  warning: '#F5A623',
  success: '#0FBB80',
  info: '#3B9EFF',
  danger: '#EF4545'
};

// Severity color mappings
export const SEVERITY_COLORS = {
  Critical: {
    color: '#EF4545',
    bg: '#EF454512',
    border: '#EF4545'
  },
  High: {
    color: '#F5A623',
    bg: '#F5A62312',
    border: '#F5A623'
  },
  Medium: {
    color: '#3B9EFF',
    bg: '#3B9EFF12',
    border: '#3B9EFF'
  },
  Low: {
    color: '#0FBB80',
    bg: '#0FBB8012',
    border: '#0FBB80'
  }
};

// Status colors
export const STATUS_COLORS = {
  pending_approval: '#F5A623',
  approved: '#3B9EFF',
  routed: '#A78BFA',
  complete: '#0FBB80',
  pending: '#F5A623',
  in_progress: '#3B9EFF',
  error: '#EF4545',
  warning: '#F5A623',
  success: '#0FBB80',
  connected: '#0FBB80',
  disconnected: '#888888',
  syncing: '#F5A623'
};

// Spacing scale
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24
};

// Border radius
export const RADIUS = {
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
  full: 9999
};

// Font sizes
export const FONT_SIZES = {
  xs: 9,
  sm: 10,
  base: 11,
  md: 12,
  lg: 13,
  xl: 14,
  '2xl': 16,
  '3xl': 18,
  '4xl': 20
};

// Font weights
export const FONT_WEIGHTS = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800
};

// Z-index scale
export const Z_INDEX = {
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070
};

// Breakpoints
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
};
