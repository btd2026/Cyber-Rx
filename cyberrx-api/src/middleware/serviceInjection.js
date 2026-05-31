'use strict';

const { ServiceFactory } = require('../domains');

/**
 * Service Injection Middleware
 *
 * Injects models, db, logger, and service factory into request object
 * for use in route handlers
 */
function serviceInjectionMiddleware(models, db, logger) {
  return (req, res, next) => {
    // Inject models
    req.models = models;

    // Inject database
    req.db = db;

    // Inject logger
    req.logger = logger;

    // Inject service factory
    req.services = new ServiceFactory(models, db, logger);

    next();
  };
}

module.exports = serviceInjectionMiddleware;
