'use strict';

/**
 * BullMQ Queue Demo Script
 *
 * Demonstrates basic queue operations for testing and development
 *
 * Usage:
 *   node cyberrx-api/examples/queue-demo.js
 *
 * Prerequisites:
 * - Redis must be running (local or configured via REDIS_URL)
 * - Environment variables must be configured
 */

require('dotenv').config();
const queue = require('../src/workers/queue');

async function demo() {
  console.log('=== BullMQ Vendor Sync Queue Demo ===\n');

  try {
    // 1. Health check
    console.log('1. Testing Redis connection...');
    const isConnected = await queue.testConnection();
    console.log(`   Connection: ${isConnected ? 'SUCCESS' : 'FAILED'}\n`);

    if (!isConnected) {
      console.error('ERROR: Redis is not available. Please start Redis:');
      console.error('  docker run -d -p 6379:6379 redis:7-alpine');
      console.error('  or set REDIS_URL environment variable\n');
      process.exit(1);
    }

    // 2. Health check
    console.log('2. Queue health check...');
    const health = await queue.healthCheck();
    console.log(`   Status: ${health.status}`);
    console.log(`   Queue: ${health.queueName}`);
    console.log(`   Metrics:`, health.metrics);
    console.log();

    // 3. Add test jobs
    console.log('3. Adding test jobs to queue...');

    const job1 = await queue.addJob(queue.JobTypes.SYNC_VENDOR, {
      organizationId: 'demo-org-001',
      vendorId: 'demo-vendor-001',
      priority: 1
    });
    console.log(`   Added SYNC_VENDOR job: ${job1.id}`);

    const job2 = await queue.addJob(queue.JobTypes.SYNC_CONNECTOR, {
      organizationId: 'demo-org-001',
      connectorType: 'bcbs_210',
      priority: 5
    });
    console.log(`   Added SYNC_CONNECTOR job: ${job2.id}`);

    const job3 = await queue.addJob(queue.JobTypes.ASSESSMENT, {
      organizationId: 'demo-org-001',
      vendorId: 'demo-vendor-002',
      priority: 3
    });
    console.log(`   Added ASSESSMENT job: ${job3.id}`);
    console.log();

    // 4. Get job states
    console.log('4. Checking job states...');
    const state1 = await queue.getJobState(job1.id);
    console.log(`   Job ${job1.id}: ${state1?.state || 'not found'}`);

    const state2 = await queue.getJobState(job2.id);
    console.log(`   Job ${job2.id}: ${state2?.state || 'not found'}`);

    const state3 = await queue.getJobState(job3.id);
    console.log(`   Job ${job3.id}: ${state3?.state || 'not found'}`);
    console.log();

    // 5. List jobs
    console.log('5. Listing jobs in queue...');
    const jobs = await queue.getJobs(['waiting', 'active'], 0, 10);
    console.log(`   Found ${jobs.length} jobs:`);
    jobs.forEach((job, index) => {
      console.log(`   ${index + 1}. ${job.name} (ID: ${job.id})`);
    });
    console.log();

    // 6. Get queue metrics
    console.log('6. Queue metrics...');
    const metrics = await queue.getQueueMetrics();
    console.log(`   Waiting: ${metrics.waiting}`);
    console.log(`   Active: ${metrics.active}`);
    console.log(`   Completed: ${metrics.completed}`);
    console.log(`   Failed: ${metrics.failed}`);
    console.log(`   Delayed: ${metrics.delayed}`);
    console.log(`   Total: ${metrics.total}`);
    console.log();

    console.log('=== Demo Complete ===');
    console.log('\nNote: Jobs will remain in queue until a worker processes them.');
    console.log('To process these jobs, implement and run the worker processor.');
    console.log('\nTo clean up demo jobs:');
    console.log('  await queue.obliterate(); // Removes all jobs');

  } catch (error) {
    console.error('Demo failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Close queue connection
    await queue.close();
    console.log('\nQueue connection closed.');
  }
}

// Run demo
demo().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
