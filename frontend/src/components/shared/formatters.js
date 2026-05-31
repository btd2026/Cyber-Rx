/**
 * Shared Formatter Functions
 *
 * Utility functions for formatting data throughout the application.
 */

/**
 * Format currency with appropriate scale
 */
export function formatCurrency(amount) {
  if (!amount || amount === 0) {
    return '$0';
  }

  const abs = Math.abs(amount);

  if (abs >= 1e9) {
    return '$' + (amount / 1e9).toFixed(1) + 'B';
  }
  if (abs >= 1e6) {
    return '$' + Math.round(amount / 1e6) + 'M';
  }
  if (abs >= 1e3) {
    return '$' + Math.round(amount / 1e3) + 'K';
  }

  return '$' + Math.round(amount);
}

/**
 * Format currency in millions (for revenue/expenses)
 */
export function formatMillions(amount) {
  if (!amount && amount !== 0) {
    return '$0';
  }

  if (amount >= 1000) {
    return '$' + (amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1) + 'B';
  }
  if (amount >= 100) {
    return '$' + Math.round(amount) + 'M';
  }
  if (amount >= 10) {
    return '$' + amount.toFixed(1) + 'M';
  }

  return '$' + amount.toFixed(1) + 'M';
}

/**
 * Format numbers with appropriate scale
 */
export function formatNumber(num) {
  if (!num) {
    return '0';
  }

  if (num >= 1e6) {
    return (num / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1e3) {
    return (num / 1e3).toFixed(0) + 'K';
  }

  return String(Math.round(num));
}

/**
 * Format percentage
 */
export function formatPercent(value, decimals = 1) {
  if (value === null || value === undefined) {
    return '—';
  }
  return value.toFixed(decimals) + '%';
}

/**
 * Format date relative to now
 */
export function formatDateRelative(date) {
  if (!date) {
    return 'Never';
  }

  const d = new Date(date);
  const now = new Date();
  const daysAgo = Math.floor((now - d) / (1000 * 60 * 60 * 24));

  if (daysAgo === 0) {
    return 'Today';
  }
  if (daysAgo === 1) {
    return 'Yesterday';
  }
  if (daysAgo < 7) {
    return `${daysAgo} days ago`;
  }
  if (daysAgo < 30) {
    const weeks = Math.floor(daysAgo / 7);
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  }
  if (daysAgo < 365) {
    const months = Math.floor(daysAgo / 30);
    return `${months} month${months > 1 ? 's' : ''} ago`;
  }

  return d.toLocaleDateString();
}

/**
 * Extract name from email
 */
export function nameFromEmail(email) {
  if (!email) {
    return '';
  }

  const parts = email.split('@')[0].split('.');
  return parts
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
}

/**
 * Get health status label from score
 */
export function getHealthStatus(score) {
  if (score >= 80) {
    return 'Healthy';
  }
  if (score >= 60) {
    return 'At Risk';
  }
  return 'Critical';
}

/**
 * Get health color from score
 */
export function getHealthColor(score) {
  if (score >= 80) {
    return '#0FBB80';
  }
  if (score >= 60) {
    return '#F5A623';
  }
  return '#EF4545';
}

/**
 * Format days since
 */
export function formatDaysSince(value, threshold) {
  if (!value && value !== 0) {
    return 'No data';
  }

  const days = parseInt(value);

  if (days > threshold) {
    return `${days} days (expired)`;
  }

  return `${days} days`;
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text, maxLength = 50) {
  if (!text || text.length <= maxLength) {
    return text;
  }

  return text.substring(0, maxLength) + '...';
}

/**
 * Format file size
 */
export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) {
    return '0 B';
  }

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
