/**
 * Health Check Endpoint Tests
 */

const request = require('supertest');
const db = require('../../src/utils/db');

jest.mock('../../src/utils/db', () => ({
  query: jest.fn(),
  pool: {
    totalCount: 10,
    idleCount: 7,
    waitingCount: 0
  }
}));

const app = require('../../src/index');

describe('Health Check Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /health', () => {
    it('should return 200 when all services are healthy', async () => {
      db.query.mockResolvedValue([{ result: 1 }]);
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
      expect(response.body.checks.database.status).toBe('healthy');
      expect(response.body.checks.database.connected).toBe(true);
    });

    it('should return 503 when database is unhealthy', async () => {
      db.query.mockRejectedValue(new Error('Connection refused'));
      const response = await request(app).get('/health');

      expect(response.status).toBe(503);
      expect(response.body.status).toBe('unhealthy');
      expect(response.body.checks.database.status).toBe('unhealthy');
      expect(response.body.checks.database.connected).toBe(false);
    });

    it('should respond within 1 second', async () => {
      db.query.mockResolvedValue([{ result: 1 }]);
      const start = Date.now();
      const response = await request(app).get('/health');
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(1000);
    });

    it('should include latency metrics', async () => {
      db.query.mockResolvedValue([{ result: 1 }]);
      const response = await request(app).get('/health');

      expect(response.body.checks.database.latency_ms).toBeDefined();
      expect(typeof response.body.checks.database.latency_ms).toBe('number');
    });
  });

  describe('GET /health/live', () => {
    it('should return 200 when service is alive', async () => {
      const response = await request(app).get('/health/live');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('alive');
      expect(response.body.timestamp).toBeDefined();
    });

    it('should respond quickly (< 100ms)', async () => {
      const start = Date.now();
      const response = await request(app).get('/health/live');
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(100);
    });
  });

  describe('GET /health/ready', () => {
    it('should return 200 when all dependencies ready', async () => {
      db.query.mockResolvedValue([{ result: 1 }]);
      const response = await request(app).get('/health/ready');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ready');
      expect(response.body.checks.database).toBe(true);
    });

    it('should return 503 when database not ready', async () => {
      db.query.mockRejectedValue(new Error('Connection timeout'));
      const response = await request(app).get('/health/ready');

      expect(response.status).toBe(503);
      expect(response.body.status).toBe('not_ready');
      expect(response.body.checks.database).toBe(false);
    });

    it('should timeout after 1 second if hangs', async () => {
      db.query.mockImplementation(() => new Promise(() => {}));
      const start = Date.now();
      const response = await request(app).get('/health/ready');
      const duration = Date.now() - start;

      expect(response.status).toBe(503);
      expect(duration).toBeLessThan(1500);
      expect(response.body.error).toContain('timeout');
    });
  });

  describe('GET /health/database', () => {
    it('should return database health with pool stats', async () => {
      db.query.mockResolvedValueOnce([{ result: 1 }])
        .mockResolvedValueOnce({ rows: [{ size: '256MB' }] })
        .mockResolvedValueOnce({ rows: [{ active_connections: 3 }] });

      const response = await request(app).get('/health/database');

      expect(response.status).toBe(200);
      expect(response.body.database.connected).toBe(true);
      expect(response.body.database.pool).toBeDefined();
    });

    it('should return 503 when database connection fails', async () => {
      db.query.mockRejectedValue(new Error('Connection refused'));
      const response = await request(app).get('/health/database');

      expect(response.status).toBe(503);
      expect(response.body.database.connected).toBe(false);
    });
  });

  describe('GET /health/metrics', () => {
    it('should return system metrics', async () => {
      const response = await request(app).get('/health/metrics');

      expect(response.status).toBe(200);
      expect(response.body.system).toBeDefined();
      expect(response.body.system.memory).toBeDefined();
      expect(response.body.system.uptime).toBeDefined();
    });

    it('should include memory usage breakdown', async () => {
      const response = await request(app).get('/health/metrics');

      expect(response.body.system.memory.rss).toBeDefined();
      expect(response.body.system.memory.heapTotal).toBeDefined();
      expect(response.body.system.memory.heapUsed).toBeDefined();
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent health checks', async () => {
      db.query.mockResolvedValue([{ result: 1 }]);
      const requests = Array(10).fill(null).map(() =>
        request(app).get('/health')
      );
      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('healthy');
      });
    });

    it('should complete 5 health checks in under 2 seconds', async () => {
      db.query.mockResolvedValue([{ result: 1 }])
        .mockResolvedValueOnce({ rows: [{ size: '256MB' }] })
        .mockResolvedValueOnce({ rows: [{ active_connections: 3 }] });

      const start = Date.now();
      await Promise.all([
        request(app).get('/health'),
        request(app).get('/health/live'),
        request(app).get('/health/ready'),
        request(app).get('/health/database'),
        request(app).get('/health/metrics')
      ]);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(2000);
    });
  });
});
