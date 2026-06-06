'use strict';

const express = require('express');
const alertFeed = require('./alertFeed');

/**
 * Alerting Routes Index
 *
 * Exports all alerting-related routes
 */

const router = express.Router();

// Mount alert feed routes
router.use('/', alertFeed);

module.exports = router;
