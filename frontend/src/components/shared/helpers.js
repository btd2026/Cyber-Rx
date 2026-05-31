/**
 * Shared Helper Functions
 *
 * Utility functions for common operations throughout the application.
 */

import { getHealthColor } from './formatters';

/**
 * Debounce function execution
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function execution
 */
export function throttle(func, limit) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Deep clone object
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }

  if (obj instanceof Array) {
    return obj.map((item) => deepClone(item));
  }

  if (typeof obj === 'object') {
    const clonedObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
}

/**
 * Generate unique ID
 */
export function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Sort array by property
 */
export function sortByProperty(arr, prop, direction = 'asc') {
  return arr.sort((a, b) => {
    const aVal = a[prop];
    const bVal = b[prop];

    if (aVal === bVal) return 0;

    const comparison = aVal < bVal ? -1 : 1;
    return direction === 'asc' ? comparison : -comparison;
  });
}

/**
 * Group array by property
 */
export function groupByProperty(arr, prop) {
  return arr.reduce((groups, item) => {
    const key = item[prop] || 'Other';
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
    return groups;
  }, {});
}

/**
 * Calculate average of array
 */
export function average(arr) {
  if (!arr || arr.length === 0) {
    return 0;
  }
  return arr.reduce((sum, val) => sum + val, 0) / arr.length;
}

/**
 * Calculate median of array
 */
export function median(arr) {
  if (!arr || arr.length === 0) {
    return 0;
  }

  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Check if value is in range
 */
export function inRange(value, min, max) {
  return value >= min && value <= max;
}

/**
 * Clamp value between min and max
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Round to decimal places
 */
export function roundTo(value, decimals = 2) {
  const multiplier = Math.pow(10, decimals);
  return Math.round(value * multiplier) / multiplier;
}

/**
 * Check if arrays are equal
 */
export function arraysEqual(arr1, arr2) {
  if (arr1.length !== arr2.length) {
    return false;
  }

  return arr1.every((val, index) => val === arr2[index]);
}

/**
 * Remove duplicates from array
 */
export function unique(arr) {
  return [...new Set(arr)];
}

/**
 * Chunk array into smaller arrays
 */
export function chunk(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/**
 * Pick specific properties from object
 */
export function pick(obj, props) {
  return props.reduce((acc, prop) => {
    if (obj.hasOwnProperty(prop)) {
      acc[prop] = obj[prop];
    }
    return acc;
  }, {});
}

/**
 * Omit specific properties from object
 */
export function omit(obj, props) {
  const result = { ...obj };
  props.forEach((prop) => {
    delete result[prop];
  });
  return result;
}

/**
 * Merge objects with deep merge
 */
export function deepMerge(target, ...sources) {
  if (!sources.length) return target;
  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        deepMerge(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }

  return deepMerge(target, ...sources);
}

function isObject(item) {
  return item && typeof item === 'object' && !Array.isArray(item);
}

/**
 * Safe JSON parse with fallback
 */
export function safeJsonParse(str, fallback = null) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return fallback;
  }
}

/**
 * Convert query string to object
 */
export function queryStringToObj(queryString) {
  const params = new URLSearchParams(queryString);
  const obj = {};
  for (const [key, value] of params) {
    obj[key] = value;
  }
  return obj;
}

/**
 * Convert object to query string
 */
export function objToQueryString(obj) {
  return new URLSearchParams(obj).toString();
}
