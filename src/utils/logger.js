/**
 * Logger Utility
 * 
 * Simple structured logger with consistent format.
 * Replace console.log/console.error with this for production readiness.
 */

const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
};

const CURRENT_LEVEL = process.env.LOG_LEVEL
    ? LOG_LEVELS[process.env.LOG_LEVEL.toUpperCase()] || LOG_LEVELS.INFO
    : LOG_LEVELS.INFO;

const formatMessage = (level, context, message, data = null) => {
    const timestamp = new Date().toISOString();
    const logEntry = {
        timestamp,
        level,
        context,
        message,
    };

    if (data && process.env.NODE_ENV !== 'production') {
        logEntry.data = data;
    }

    return logEntry;
};

const logger = {
    debug: (context, message, data) => {
        if (CURRENT_LEVEL <= LOG_LEVELS.DEBUG) {
            console.log(JSON.stringify(formatMessage('DEBUG', context, message, data)));
        }
    },

    info: (context, message, data) => {
        if (CURRENT_LEVEL <= LOG_LEVELS.INFO) {
            console.log(JSON.stringify(formatMessage('INFO', context, message, data)));
        }
    },

    warn: (context, message, data) => {
        if (CURRENT_LEVEL <= LOG_LEVELS.WARN) {
            console.warn(JSON.stringify(formatMessage('WARN', context, message, data)));
        }
    },

    error: (context, message, error) => {
        if (CURRENT_LEVEL <= LOG_LEVELS.ERROR) {
            const logEntry = formatMessage('ERROR', context, message);
            if (error) {
                logEntry.error = {
                    message: error.message,
                    // Only include stack in non-production
                    ...(process.env.NODE_ENV !== 'production' && { stack: error.stack }),
                };
            }
            console.error(JSON.stringify(logEntry));
        }
    },
};

export default logger;
