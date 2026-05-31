const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

// Custom format for production logs
const productionFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'ISO8601'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf((info) => {
    // Add structured fields
    const logEntry = {
      timestamp: info.timestamp,
      level: info.level,
      environment: process.env.NODE_ENV || 'development',
      service: 'cyberrx-api',
      version: process.env.npm_package_version || '1.0.0',
      ...info
    };
    return JSON.stringify(logEntry);
  })
);

// Custom format for development logs (readable console output)
const developmentFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

// Daily rotating file transport for all logs
const allLogsTransport = new DailyRotateFile({
  filename: 'logs/application-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',
  format: productionFormat
});

// Daily rotating file transport for errors only
const errorLogsTransport = new DailyRotateFile({
  filename: 'logs/error-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '30d',
  level: 'error',
  format: productionFormat
});

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: productionFormat,
  transports: [
    // Console transport
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'production'
        ? winston.format.combine(winston.format.json())
        : developmentFormat,
      silent: process.env.NODE_ENV === 'test'
    }),
    // File transports
    allLogsTransport,
    errorLogsTransport
  ],
  // Handle exceptions and rejections
  exceptionHandlers: [
    new DailyRotateFile({
      filename: 'logs/exceptions-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d'
    })
  ],
  rejectionHandlers: [
    new DailyRotateFile({
      filename: 'logs/rejections-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d'
    })
  ]
});

// Create a child logger with additional context
logger.child = (context) => {
  return logger.child(context);
};

// Stream for Morgan HTTP logging
logger.stream = {
  write: (message) => {
    logger.info(message.trim());
  }
};

module.exports = logger;
