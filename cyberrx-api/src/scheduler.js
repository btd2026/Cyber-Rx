'use strict';
require('dotenv').config();
const db = require('./utils/db');
const vault = require('./utils/vault');
const cron = require('node-cron');
const logger = require('./utils/logger');
const { queue, addJob, JobTypes } = require('./workers/queue');
const { getSyncInterval, getTierPriority, getEnabledConnectors } = require('./utils/syncConfig');
const Vendor = require('./models/Vendor');
const CredentialRotationService = require('./services/CredentialRotationService');
const AlertService = require('./services/AlertService');
const ExecutiveAgentService = require('./services/ExecutiveAgentService');

// Continuous executive agent layer: regenerate role-specific briefs for every org.
async function refreshExecutiveBriefs() {
  // First re-sync posture metrics from the simulated live-source tables so the
  // briefs and dashboards reflect any changes made to the source data.
  try {
    const SimulatedToolService = require('./services/SimulatedToolService');
    await SimulatedToolService.syncAll();
  } catch (err) {
    logger.warn('[scheduler] Simulated source sync skipped', { error: err.message });
  }
  try {
    const orgs = await db.query('SELECT id FROM orgs');
    for (const { id } of orgs) {
      try {
        await ExecutiveAgentService.generateAll(id);
      } catch (err) {
        logger.warn('[scheduler] Executive brief refresh failed for org', { orgId: id, error: err.message });
      }
    }
    logger.info('[scheduler] Executive agent briefs refreshed', {
      orgs: orgs.length,
      mode: ExecutiveAgentService.aiEnabled() ? 'ai' : 'deterministic',
    });
  } catch (err) {
    logger.warn('[scheduler] Executive brief refresh skipped', { error: err.message });
  }
}

// Continuous assessment: re-run the unified assessment engine for every org so
// scores/gaps refresh on a cadence ("posture measured continuously, not after").
async function refreshAssessments() {
  try {
    const AssessmentEngine = require('./services/AssessmentEngine');
    const orgs = await db.query('SELECT id FROM orgs');
    for (const { id } of orgs) {
      try { await AssessmentEngine.run(id); }
      catch (err) { logger.warn('[scheduler] Assessment refresh failed for org', { orgId: id, error: err.message }); }
    }
    logger.info('[scheduler] Unified assessments refreshed', { orgs: orgs.length });
  } catch (err) {
    logger.warn('[scheduler] Assessment refresh skipped', { error: err.message });
  }
}

// Continuous monitoring: re-pull signals from every org's CONNECTED integrations
// (the ones whose API credentials were vaulted at connect) on a cadence, so the
// live tool data stays fresh without anyone pressing "sync". This is what makes a
// saved connection an actually-monitored one.
async function refreshIntegrations() {
  try {
    const Integrations = require('./services/IntegrationService');
    await Integrations.ensureTables();
    let rows = [];
    try { rows = await db.query("SELECT org_id, connector FROM integrations WHERE status='connected'"); } catch (_) { rows = []; }
    let ok = 0, fail = 0;
    for (const r of rows) {
      try { await Integrations.sync(r.org_id, r.connector); ok += 1; }
      catch (err) { fail += 1; logger.warn('[scheduler] integration re-sync failed', { orgId: r.org_id, connector: r.connector, error: err.message }); }
    }
    logger.info('[scheduler] Connected integrations re-synced (continuous monitoring)', { connected: rows.length, ok, fail });
  } catch (err) {
    logger.warn('[scheduler] Integration refresh skipped', { error: err.message });
  }
}

// Existing tool sync schedule (legacy metric sync)
const SYNC_SCHEDULE = {
  okta:        { metric: 'mfaPct',      intervalHrs: 24 },
  crowdstrike: { metric: 'edrPct',      intervalHrs: 24 },
  tenable:     { metric: 'patchPct',    intervalHrs: 24 },
  splunk:      { metric: 'siemDays',    intervalHrs: 168 },
  knowbe4:     { metric: 'phishingPct', intervalHrs: 720 },
  servicenow:  { metric: 'mttrHrs',     intervalHrs: 168 },
  cyberark:    { metric: 'pamPct',      intervalHrs: 168 },
  workday:     { metric: 'trainingPct', intervalHrs: 720 },
};

const API_BASE = process.env.API_BASE || 'http://api:3001';

async function syncOrg(orgId, tool) {
  try {
    const creds = await vault.get(orgId, tool);
    if (!creds) return;
    const res = await fetch(`${API_BASE}/api/tools/${tool}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Org-Id': orgId },
    });
    const data = await res.json();
    if (data.value != null) {
      await db.query(
        `INSERT INTO metrics (org_id, metric_key, value, source, demo)
         VALUES ($1, $2, $3, $4, $5)`,
        [orgId, data.metric_key, data.value, tool, data.demo || false]
      );
      console.log(`[scheduler] ${orgId}/${tool} → ${data.metric_key}=${data.value}`);
    }
  } catch (err) {
    console.error(`[scheduler] sync error ${orgId}/${tool}:`, err.message);
  }
}

/**
 * Schedule vendor sync jobs based on tier
 * Queues BullMQ jobs instead of executing inline
 */
async function scheduleVendorSyncs() {
  try {
    await db.init();
    logger.info('[scheduler] Starting vendor sync scheduling');

    // Get all organizations with vendors
    const orgs = await db.query('SELECT id FROM orgs');
    const enabledConnectors = getEnabledConnectors();

    logger.info(`[scheduler] Scheduling syncs for ${orgs.length} organizations`);

    for (const org of orgs) {
      try {
        // Get all vendors for this organization
        const vendors = await Vendor.findByOrganization(org.id);

        logger.info(`[scheduler] Processing ${vendors.length} vendors for org ${org.id}`);

        // Group vendors by tier
        const vendorsByTier = {
          critical: vendors.filter(v => v.tier.toLowerCase() === 'critical'),
          high: vendors.filter(v => v.tier.toLowerCase() === 'high'),
          medium: vendors.filter(v => v.tier.toLowerCase() === 'medium'),
          low: vendors.filter(v => v.tier.toLowerCase() === 'low')
        };

        // Schedule syncs for each tier
        for (const [tier, tierVendors] of Object.entries(vendorsByTier)) {
          if (tierVendors.length === 0) continue;

          const interval = getSyncInterval(tier);
          const priority = getTierPriority(tier);

          logger.info(`[scheduler] Scheduling ${tierVendors.length} ${tier} vendors with interval: ${interval}`);

          // Create a cron job for this tier
          const taskName = `vendor-sync-${org.id}-${tier}`;

          // Remove existing task if any
          if (cron.getTasks().has(taskName)) {
            cron.getTasks().get(taskName).stop();
          }

          // Schedule new task
          const task = cron.schedule(interval, async () => {
            logger.info(`[scheduler] Running scheduled sync for ${tier} vendors in org ${org.id}`);

            for (const vendor of tierVendors) {
              try {
                // Queue sync job for each vendor
                const job = await addJob(JobTypes.SYNC_VENDOR, {
                  organizationId: org.id,
                  vendorId: vendor.id,
                  priority
                });

                logger.info(`[scheduler] Queued sync job ${job.id} for vendor ${vendor.name}`, {
                  jobId: job.id,
                  vendorId: vendor.id,
                  vendorName: vendor.name,
                  tier,
                  interval
                });

              } catch (err) {
                logger.error(`[scheduler] Failed to queue sync for vendor ${vendor.id}:`, {
                  error: err.message,
                  vendorId: vendor.id,
                  vendorName: vendor.name
                });
              }
            }
          }, {
            scheduled: true,
            timezone: process.env.TZ || 'UTC'
          });

          logger.info(`[scheduler] Scheduled task ${taskName} with cron: ${interval}`);
        }

      } catch (err) {
        logger.error(`[scheduler] Failed to schedule vendor syncs for org ${org.id}:`, {
          error: err.message,
          organizationId: org.id
        });
      }
    }

    logger.info('[scheduler] Vendor sync scheduling completed');

  } catch (err) {
    logger.error('[scheduler] Fatal error in scheduleVendorSyncs:', {
      error: err.message,
      stack: err.stack
    });
  }
}

/**
 * Schedule manual sync for a specific vendor
 * Used for on-demand sync requests
 *
 * @param {string} vendorId - Vendor ID
 * @param {string} organizationId - Organization ID
 * @param {string} [connectorType] - Specific connector type (optional)
 * @returns {Promise<Object>} Job details
 */
async function scheduleManualSync(vendorId, organizationId, connectorType = null) {
  try {
    const vendor = await Vendor.findById(vendorId);

    if (!vendor) {
      throw new Error(`Vendor ${vendorId} not found`);
    }

    if (vendor.organizationId !== organizationId) {
      throw new Error(`Vendor ${vendorId} does not belong to organization ${organizationId}`);
    }

    const priority = getTierPriority(vendor.tier);

    // Queue immediate sync job
    const job = await addJob(JobTypes.SYNC_VENDOR, {
      organizationId,
      vendorId,
      connectorType: connectorType || 'all',
      priority
    });

    logger.info(`[scheduler] Manual sync queued`, {
      jobId: job.id,
      vendorId,
      vendorName: vendor.name,
      connectorType,
      priority
    });

    return {
      jobId: job.id,
      vendorId,
      vendorName: vendor.name,
      status: 'queued',
      scheduledFor: new Date()
    };

  } catch (err) {
    logger.error('[scheduler] Failed to schedule manual sync:', {
      error: err.message,
      vendorId,
      organizationId
    });
    throw err;
  }
}

/**
 * Get all scheduled vendor sync tasks
 * @returns {Promise<Object>} Scheduled tasks summary
 */
async function getScheduledTasks() {
  try {
    const tasks = [];
    const orgs = await db.query('SELECT id FROM orgs');

    for (const org of orgs) {
      const vendors = await Vendor.findByOrganization(org.id);
      const vendorsByTier = vendors.reduce((acc, vendor) => {
        const tier = vendor.tier.toLowerCase();
        if (!acc[tier]) acc[tier] = [];
        acc[tier].push(vendor);
        return acc;
      }, {});

      for (const [tier, tierVendors] of Object.entries(vendorsByTier)) {
        if (tierVendors.length > 0) {
          const interval = getSyncInterval(tier);
          tasks.push({
            organizationId: org.id,
            tier,
            vendorCount: tierVendors.length,
            interval,
            nextRun: null // Could be calculated with a cron parser
          });
        }
      }
    }

    return { tasks, total: tasks.length };

  } catch (err) {
    logger.error('[scheduler] Failed to get scheduled tasks:', {
      error: err.message
    });
    throw err;
  }
}

/**
 * Stop all scheduled vendor sync tasks
 */
async function stopVendorSyncs() {
  try {
    const tasks = cron.getTasks();

    for (const [name, task] of tasks.entries()) {
      if (name.startsWith('vendor-sync-')) {
        task.stop();
        logger.info(`[scheduler] Stopped task: ${name}`);
      }
    }

    logger.info('[scheduler] All vendor sync tasks stopped');

  } catch (err) {
    logger.error('[scheduler] Failed to stop vendor syncs:', {
      error: err.message
    });
    throw err;
  }
}

/**
 * Check credential rotation for all organizations
 * Runs daily at 9 AM
 */
async function checkCredentialRotations() {
  try {
    await db.init();
    logger.info('[scheduler] Starting credential rotation check');

    const rotationService = new CredentialRotationService();
    const alertService = new AlertService();

    // Get all organizations
    const orgs = await db.query('SELECT id FROM orgs');

    logger.info(`[scheduler] Checking credentials for ${orgs.length} organizations`);

    for (const org of orgs) {
      try {
        // Check credentials for rotation
        const alerts = await rotationService.checkCredentialRotation(org.id);

        if (alerts.length > 0) {
          logger.info(`[scheduler] Found ${alerts.length} credentials needing rotation for org ${org.id}`);

          // Send alerts for credentials needing rotation
          for (const alert of alerts) {
            try {
              // Check severity - only send alerts for Medium or higher
              if (alert.severity !== 'Low') {
                await alertService.sendAlert(alert);
                logger.info('[scheduler] Credential rotation alert sent', {
                  organizationId: org.id,
                  connectorType: alert.connectorType,
                  severity: alert.severity
                });
              }
            } catch (alertError) {
              logger.error('[scheduler] Failed to send credential rotation alert', {
                error: alertError.message,
                organizationId: org.id,
                connectorType: alert.connectorType
              });
            }
          }
        } else {
          logger.info(`[scheduler] No credentials need rotation for org ${org.id}`);
        }
      } catch (orgError) {
        logger.error(`[scheduler] Failed to check credentials for org ${org.id}:`, {
          error: orgError.message
        });
      }
    }

    logger.info('[scheduler] Credential rotation check completed');
  } catch (error) {
    logger.error('[scheduler] Fatal error in credential rotation check:', {
      error: error.message,
      stack: error.stack
    });
  }
}

/**
 * Main scheduler initialization
 */
async function runScheduler() {
  await db.init();
  logger.info('[scheduler] Nerion scheduler initialized');

  // Start legacy metric sync
  logger.info('[scheduler] Starting legacy metric sync');
  const tick = async () => {
    try {
      const orgs = await db.query('SELECT id FROM orgs');
      for (const org of orgs) {
        for (const [tool, cfg] of Object.entries(SYNC_SCHEDULE)) {
          const lastRows = await db.query(
            `SELECT collected_at FROM metrics
             WHERE org_id=$1 AND source=$2
             ORDER BY collected_at DESC LIMIT 1`,
            [org.id, tool]
          );
          const lastSync = lastRows[0]?.collected_at;
          const ageHrs = lastSync
            ? (Date.now() - new Date(lastSync)) / 3600000
            : Infinity;
          if (ageHrs >= cfg.intervalHrs) {
            await syncOrg(org.id, tool);
          }
        }
      }
    } catch (err) {
      logger.error('[scheduler] Legacy sync tick error:', { error: err.message });
    }
  };

  // Run legacy sync immediately then every 15 minutes
  await tick();
  setInterval(tick, 15 * 60 * 1000);

  // Start vendor sync scheduling
  logger.info('[scheduler] Starting vendor sync scheduling');
  await scheduleVendorSyncs();

  // Start credential rotation check - runs daily at 9 AM
  logger.info('[scheduler] Starting credential rotation check');
  const rotationTask = cron.schedule('0 9 * * *', checkCredentialRotations, {
    scheduled: true,
    timezone: process.env.TZ || 'UTC'
  });
  logger.info('[scheduler] Credential rotation check scheduled for 9 AM daily');

  // Run credential rotation check immediately on startup
  await checkCredentialRotations();

  // Continuous executive agent briefs - "your intelligence should be automated too"
  const briefCron = process.env.BRIEF_REFRESH_CRON || '*/15 * * * *';
  logger.info('[scheduler] Starting executive agent brief refresh', { schedule: briefCron });
  cron.schedule(briefCron, refreshExecutiveBriefs, {
    scheduled: true,
    timezone: process.env.TZ || 'UTC'
  });
  // Generate an initial set on startup so dashboards have live briefs immediately
  await refreshExecutiveBriefs();

  // Continuous unified assessment refresh.
  const assessCron = process.env.ASSESSMENT_REFRESH_CRON || '0 */6 * * *';
  logger.info('[scheduler] Starting unified assessment refresh', { schedule: assessCron });
  cron.schedule(assessCron, refreshAssessments, { scheduled: true, timezone: process.env.TZ || 'UTC' });
  await refreshAssessments();

  // Continuous monitoring — re-pull live signals from every connected integration
  // (vaulted API creds) on a cadence, so a saved connection stays actively monitored.
  const integCron = process.env.INTEGRATION_REFRESH_CRON || '*/15 * * * *';
  logger.info('[scheduler] Starting connected-integration re-sync', { schedule: integCron });
  cron.schedule(integCron, refreshIntegrations, { scheduled: true, timezone: process.env.TZ || 'UTC' });
  await refreshIntegrations();

  logger.info('[scheduler] All scheduler components started');
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('[scheduler] Received SIGTERM, shutting down gracefully');
  await stopVendorSyncs();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('[scheduler] Received SIGINT, shutting down gracefully');
  await stopVendorSyncs();
  process.exit(0);
});

// Export for testing and manual control
module.exports = {
  runScheduler,
  scheduleVendorSyncs,
  scheduleManualSync,
  getScheduledTasks,
  stopVendorSyncs,
  syncOrg,
  refreshAssessments,
  refreshIntegrations
};

// Start scheduler if run directly
if (require.main === module) {
  runScheduler().catch(err => {
    logger.error('[scheduler] Fatal error starting scheduler:', {
      error: err.message,
      stack: err.stack
    });
    process.exit(1);
  });
}
