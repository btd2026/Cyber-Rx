'use strict';

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

/**
 * Winston Logger Configuration
 * Provides structured logging with daily rotation
 */

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Create console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
  })
);

// Create daily rotate file transport for all logs
const allLogsTransport = new DailyRotateFile({
  filename: 'logs/cyberrx-api-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',
  format: logFormat
});

// Create daily rotate file transport for error logs
const errorLogsTransport = new DailyRotateFile({
  filename: 'logs/error-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '30d',
  level: 'error',
  format: logFormat
});

// Create daily rotate file transport for correlation logs
const correlationLogsTransport = new DailyRotateFile({
  filename: 'logs/correlation-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',
  format: logFormat
});

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    allLogsTransport,
    errorLogsTransport,
    correlationLogsTransport
  ],
  exitOnError: false
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

// Add console transport in production for errors only
if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.Console({
    level: 'error',
    format: consoleFormat
  }));
}

// Handle log file rotation events
allLogsTransport.on('new', (filename) => {
  console.log(`New log file created: ${filename}`);
});

allLogsTransport.on('rotate', (oldFilename, newFilename) => {
  console.log(`Log file rotated from ${oldFilename} to ${newFilename}`);
});

errorLogsTransport.on('new', (filename) => {
  console.log(`New error log file created: ${filename}`);
});

/**
 * Create a child logger with additional context
 * @param {Object} context - Additional context to include in logs
 * @returns {Object} Child logger
 */
logger.child = (context) => {
  return logger.child(context);
};

/**
 * Log correlation performance
 * @param {Object} data - Performance data
 */
logger.logCorrelation = (data) => {
  logger.info('Correlation Performance', {
    type: 'correlation_performance',
    ...data
  });
};

/**
 * Log slow correlation warning
 * @param {Object} data - Slow correlation data
 */
logger.logSlowCorrelation = (data) => {
  logger.warn('Slow Correlation Detected', {
    type: 'slow_correlation',
    ...data
  });
};

/**
 * Log cache metrics
 * @param {Object} data - Cache metrics data
 */
logger.logCacheMetrics = (data) => {
  logger.info('Cache Metrics', {
    type: 'cache_metrics',
    ...data
  });
};

/**
 * Log database query performance
 * @param {Object} data - Query performance data
 */
logger.logQueryPerformance = (data) => {
  logger.debug('Query Performance', {
    type: 'query_performance',
    ...data
  });
};

module.exports = logger;
