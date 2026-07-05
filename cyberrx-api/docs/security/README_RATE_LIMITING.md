# Rate Limiting Implementation - Quick Start

## Overview

The Nerion API now features production-grade, Redis-backed rate limiting to protect against abuse, DoS attacks, and ensure fair resource allocation. This implementation replaces the previous in-memory rate limiting with a distributed, scalable solution.

## What's New

- **Distributed Rate Limiting**: Redis-backed rate limiting that works across multiple server instances
- **Multiple Strategies**: Per-IP, per-user, and per-endpoint rate limiting
- **Graceful Fallback**: Automatic fallback to in-memory if Redis unavailable
- **Standard Headers**: Rate limit information in response headers
- **Production Ready**: Configured for Redis Cloud and other managed Redis services

## Quick Start

### 1. Install Dependencies

```bash
npm install redis rate-limiter-flexible
```

### 2. Configure Redis

Add Redis configuration to your `.env` file:

```bash
# Option 1: Redis URL (recommended)
REDIS_URL=redis://localhost:6379

# Option 2: Individual settings
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

### 3. Start the API

```bash
npm run dev
```

The rate limiting system will automatically initialize and start protecting your endpoints.

## Rate Limits

### Authentication Endpoints

| Endpoint | Limit | Duration | Key Type |
|----------|-------|----------|----------|
| `POST /api/auth/login` | 5 requests | 1 minute | Per IP |
| `POST /api/auth/signup` | 3 requests | 1 minute | Per IP |

### API Endpoints

| Method | Limit | Duration | Key Type |
|--------|-------|----------|----------|
| GET | 100 requests | 1 minute | Per user |
| POST | 50 requests | 1 minute | Per user |
| PUT | 50 requests | 1 minute | Per user |
| DELETE | 20 requests | 1 minute | Per user |

## Response Headers

### Successful Request

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 2026-05-30T14:30:00.000Z
```

### Rate Limit Exceeded

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 45
X-RateLimit-Limit: 0
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 2026-05-30T14:31:00.000Z

{
  "error": "Too many requests",
  "message": "Rate limit exceeded. Please try again in 45 seconds.",
  "retryAfter": "45 seconds"
}
```

## Testing

### Unit Tests

```bash
npm run test:unit tests/unit/middleware/rateLimit.test.js
```

### Integration Tests

```bash
npm run test:integration tests/integration/rateLimiting.test.js
```

### Manual Testing

Test login rate limiting:

```bash
# Make 5 login attempts (should work)
for i in {1..5}; do
  curl -X POST http://localhost:3001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}'
done

# 6th attempt should return 429
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"wrong"}'
```

## Configuration Options

### Enable/Disable Rate Limiting

```bash
# .env
RATE_LIMIT_ENABLED=true  # or false to disable
```

### Redis Cloud Configuration

```bash
# .env
REDIS_URL=rediss://:password@redis-12345.c1.us-east-1-2.ec2.cloud.redislabs.com:12345
```

### Custom Rate Limits

Create custom rate limiters for specific endpoints:

```javascript
const { createCustomLimiter } = require('./middleware/rateLimit');

// Create VIP limiter
const vipLimiter = createCustomLimiter({
  prefix: 'rl:vip',
  points: 1000,
  duration: 60,
  keyBy: 'user'
});

// Apply to route
router.post('/api/vip/endpoint', vipLimiter, handler);
```

## Monitoring

### Health Check

```bash
curl http://localhost:3001/health
```

Response includes rate limiting status:

```json
{
  "status": "ok",
  "services": {
    "redis": {
      "status": "healthy",
      "latency": "5ms"
    },
    "rateLimiting": {
      "enabled": true,
      "backend": "redis",
      "limitersInitialized": 9
    }
  }
}
```

### Logging

Rate limiting events are logged:

```json
{
  "ts": "2026-05-30T14:25:00.000Z",
  "event": "rate_limit_exceeded",
  "ip": "192.168.1.100",
  "endpoint": "/api/auth/login"
}
```

## Troubleshooting

### Issue: Rate Limiting Not Working

**Solution:** Check if Redis is running and configured:

```bash
redis-cli ping  # Should return PONG
```

### Issue: Too Many 429 Errors

**Solution:** Adjust limits in `.env` or create custom limiters for high-traffic endpoints.

### Issue: Redis Connection Refused

**Solution:** Verify Redis configuration and connection:

```bash
redis-cli -h HOST -p PORT -a PASSWORD ping
```

## Migration from In-Memory

The old in-memory rate limiting has been replaced. Key changes:

### Before (In-Memory)

```javascript
// OLD: In-memory rate limiting
const loginAttempts = new Map();
const MAX_LOGIN_ATTEMPTS = 5;
```

### After (Redis-Backed)

```javascript
// NEW: Redis-backed rate limiting
const { authLoginLimiter } = require('./middleware/rateLimit');

router.post('/login', authLoginLimiter, handler);
```

## Documentation

For detailed documentation, see [RATE_LIMITING.md](./RATE_LIMITING.md)

## Support

For issues or questions:

1. Check the troubleshooting section
2. Review the logs for error messages
3. Verify Redis connection and configuration
4. Check the test suite for examples

## Files Changed

- `src/config/redis.js` - Redis client configuration
- `src/middleware/rateLimit.js` - Rate limiting middleware
- `src/routes/auth.js` - Updated auth routes with Redis rate limiting
- `src/index.js` - Applied rate limiting to all API routes
- `tests/unit/middleware/rateLimit.test.js` - Unit tests
- `tests/integration/rateLimiting.test.js` - Integration tests
- `docs/security/RATE_LIMITING.md` - Comprehensive documentation
- `.env.example` - Updated with Redis configuration

## Next Steps

1. Configure Redis for your environment
2. Test rate limiting in development
3. Adjust limits based on your traffic patterns
4. Set up monitoring for Redis health
5. Deploy to production with Redis Cloud or managed Redis
6. Monitor rate limit violations and adjust as needed

## Summary

The Redis-backed rate limiting system provides:

- Distributed rate limiting across multiple instances
- Multiple strategies for different endpoint types
- Graceful fallback to in-memory if Redis unavailable
- Standard headers for rate limit information
- Production-ready configuration for Redis Cloud
- Comprehensive monitoring and health checks

For detailed information, refer to [RATE_LIMITING.md](./RATE_LIMITING.md).
