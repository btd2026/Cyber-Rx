# Rate Limiting Documentation

## Overview

Nerion API implements production-grade, distributed rate limiting using Redis backend. The system protects against abuse, DoS attacks, and ensures fair resource allocation across all API endpoints.

## Architecture

### Components

1. **Redis Configuration** (`src/config/redis.js`)
   - Manages Redis client lifecycle
   - Handles connection pooling and reconnection
   - Supports both local Redis and Redis Cloud

2. **Rate Limiter Middleware** (`src/middleware/rateLimit.js`)
   - Provides multiple rate limiting strategies
   - Handles graceful fallback to in-memory if Redis unavailable
   - Adds rate limit headers to responses

3. **Integration Points**
   - Authentication endpoints: Strict IP-based limits
   - API endpoints: Method-based limits per user
   - Custom endpoints: Configurable limits

## Rate Limiting Strategies

### 1. Authentication Endpoints (Strict IP-Based)

#### Login Endpoint
- **Endpoint:** `POST /api/auth/login`
- **Limit:** 5 attempts per IP per minute
- **Block Duration:** 5 minutes after limit reached
- **Key:** `ip:{client_ip}`
- **Purpose:** Prevent brute force password attacks

#### Signup Endpoint
- **Endpoint:** `POST /api/auth/signup`
- **Limit:** 3 attempts per IP per minute
- **Block Duration:** 5 minutes after limit reached
- **Key:** `ip:{client_ip}`
- **Purpose:** Prevent automated account creation spam

### 2. API Endpoints (Method-Based Per-User)

#### GET Requests
- **Limit:** 100 requests per minute per user
- **Block Duration:** 1 minute after limit reached
- **Key:** `user:{user_id}:get`
- **Endpoints:** All GET /api/* routes

#### POST Requests
- **Limit:** 50 requests per minute per user
- **Block Duration:** 1 minute after limit reached
- **Key:** `user:{user_id}:post`
- **Endpoints:** All POST /api/* routes

#### PUT Requests
- **Limit:** 50 requests per minute per user
- **Block Duration:** 1 minute after limit reached
- **Key:** `user:{user_id}:put`
- **Endpoints:** All PUT /api/* routes

#### DELETE Requests
- **Limit:** 20 requests per minute per user
- **Block Duration:** 1 minute after limit reached
- **Key:** `user:{user_id}:delete`
- **Endpoints:** All DELETE /api/* routes

### 3. Per-User Standard Rate Limiting

- **Limit:** 100 requests per minute per user
- **Block Duration:** 1 minute after limit reached
- **Key:** `user:{user_id}`
- **Purpose:** Overall user-level protection

### 4. Per-IP Rate Limiting

#### Strict IP Limiting
- **Limit:** 10 requests per minute per IP
- **Block Duration:** 2 minutes after limit reached
- **Key:** `ip:{client_ip}`
- **Purpose:** Protect against IP-based attacks

#### Standard IP Limiting
- **Limit:** 100 requests per minute per IP
- **Block Duration:** 1 minute after limit reached
- **Key:** `ip:{client_ip}`
- **Purpose:** General IP-based protection

## Response Headers

All rate-limited responses include the following headers:

### Success Responses (Within Limit)
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 2026-05-30T14:30:00.000Z
```

### Rate Limit Exceeded Responses
```
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

## Configuration

### Environment Variables

#### Redis Configuration
```bash
# Redis connection (individual settings)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
REDIS_DB=0
REDIS_TLS=false

# Or use Redis URL (overrides individual settings)
REDIS_URL=redis://localhost:6379
# For Redis Cloud with TLS:
REDIS_URL=rediss://username:password@host:port
```

#### Rate Limiting Control
```bash
# Enable/disable rate limiting (default: enabled)
RATE_LIMIT_ENABLED=true
```

### Example Configurations

#### Local Development
```bash
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
RATE_LIMIT_ENABLED=true
```

#### Redis Cloud (Production)
```bash
REDIS_URL=rediss://:password@redis-12345.c1.us-east-1-2.ec2.cloud.redislabs.com:12345
RATE_LIMIT_ENABLED=true
```

#### Rate Limiting Disabled (Testing)
```bash
RATE_LIMIT_ENABLED=false
```

## Custom Rate Limiters

### Creating Custom Rate Limiters

For endpoints requiring custom rate limits:

```javascript
const { createCustomLimiter } = require('../middleware/rateLimit');

// Create custom limiter for VIP users
const vipUserLimiter = createCustomLimiter({
  prefix: 'rl:vip',
  points: 1000,        // 1000 requests
  duration: 60,        // per 60 seconds
  blockDuration: 60,   // Block for 1 minute
  keyBy: 'user',       // Rate limit per user
  keyPrefix: 'vip'
});

// Apply to route
router.post('/api/vip/endpoint', vipUserLimiter, handler);
```

### Custom Key Generation

For advanced key generation logic:

```javascript
const { createRateLimitMiddleware, createRateLimiter } = require('../middleware/rateLimit');

const customLimiter = createRateLimiter({
  prefix: 'rl:custom',
  points: 50,
  duration: 60
});

const customMiddleware = createRateLimitMiddleware(customLimiter, {
  keyBy: (req) => {
    // Custom key based on user tier
    const userTier = req.user?.tier || 'free';
    const userId = req.userId || req.ip;
    return `${userTier}:${userId}`;
  }
});

router.use('/api/custom', customMiddleware);
```

## Fallback Behavior

### Redis Unavailable

If Redis becomes unavailable, the system gracefully falls back to in-memory rate limiting:

1. **Detection:** Connection failures are logged
2. **Fallback:** In-memory rate limiting continues automatically
3. **Warning:** Logs indicate fallback mode
4. **Recovery:** Automatically switches back to Redis when available

**Warning:** In-memory rate limiting is not distributed and resets on server restart. For production, ensure Redis high availability.

## Monitoring

### Health Check

Rate limiting health is monitored via the health endpoint:

```bash
curl http://localhost:3001/health
```

Response includes:
```json
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2026-05-30T14:25:00.000Z",
  "environment": "production",
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
  "userId": "user-123",
  "endpoint": "/api/auth/login",
  "limit": 5,
  "remaining": 0
}
```

## Testing

### Unit Testing

Test rate limiting behavior:

```javascript
const request = require('supertest');
const app = require('../src/index');

describe('Rate Limiting', () => {
  it('should limit login attempts to 5 per minute', async () => {
    const promises = Array(6).fill(null).map(() =>
      request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'wrong' })
    );

    const responses = await Promise.all(promises);
    const successCount = responses.filter(r => r.status !== 429).length;

    expect(successCount).toBe(5);
    expect(responses[5].status).toBe(429);
  });
});
```

### Load Testing

Test rate limiting under load:

```bash
# Install artillery
npm install -g artillery

# Create test config
cat > rate-limit-test.yml <<EOF
config:
  target: 'http://localhost:3001'
  phases:
    - duration: 60
      arrivalRate: 150
scenarios:
  - name: "Test rate limiting"
    flow:
      - post:
          url: "/api/auth/login"
          json:
            email: "test@example.com"
            password: "test123"
EOF

# Run test
artillery run rate-limit-test.yml
```

## Best Practices

### 1. Monitor Rate Limit Metrics

- Track rate limit violations per endpoint
- Monitor Redis connection health
- Alert on high rate limit violation rates

### 2. Adjust Limits Based on Usage

- Review rate limit logs weekly
- Adjust limits based on legitimate traffic patterns
- Consider user tier-based limits for premium users

### 3. Use Appropriate Limits

- **Authentication:** Strict limits (5-10 attempts)
- **Read Operations:** Higher limits (100-200 requests)
- **Write Operations:** Moderate limits (20-50 requests)
- **Expensive Operations:** Strict limits (10-20 requests)

### 4. Graceful Error Handling

Always handle 429 responses in clients:

```javascript
try {
  const response = await fetch('/api/endpoint');
} catch (error) {
  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After');
    console.log(`Rate limited. Retry after ${retryAfter} seconds`);
    // Implement exponential backoff
  }
}
```

### 5. Redis High Availability

For production:
- Use Redis Cloud or AWS ElastiCache
- Configure automatic failover
- Monitor Redis health
- Set up alerts for Redis downtime

## Troubleshooting

### Issue: Rate Limiting Not Working

**Symptoms:** All requests succeed despite exceeding limits

**Solutions:**
1. Check `RATE_LIMIT_ENABLED` environment variable
2. Verify Redis connection: `curl http://localhost:3001/health`
3. Check logs for Redis connection errors
4. Verify middleware is applied to routes

### Issue: Too Many 429 Errors

**Symptoms:** Legitimate traffic gets rate limited

**Solutions:**
1. Review rate limit configuration
2. Adjust limits for specific endpoints
3. Implement custom rate limiters for high-traffic users
4. Check Redis key expiration settings

### Issue: Redis Connection Refused

**Symptoms:** Logs show "Redis connection refused"

**Solutions:**
1. Verify Redis is running: `redis-cli ping`
2. Check Redis host and port configuration
3. Verify Redis password (if using)
4. Test connection: `redis-cli -h HOST -p PORT -a PASSWORD ping`

### Issue: In-Memory Fallback Active

**Symptoms:** Logs show "Redis unavailable, using in-memory rate limiting"

**Solutions:**
1. Check Redis server status
2. Verify network connectivity to Redis
3. Check Redis authentication credentials
4. Review Redis logs for errors

## Security Considerations

### 1. Prevent Bypass

- Apply rate limiting **before** authentication checks
- Use IP-based limiting for auth endpoints
- Use user-based limiting for authenticated endpoints
- Never rely on client-side rate limiting

### 2. Protect Against DDoS

- Use strict limits on expensive operations
- Implement IP-based blocking for repeat offenders
- Monitor for distributed attack patterns
- Consider CAPTCHA for repeated violations

### 3. Data Privacy

- Rate limiting keys should not contain PII
- Use user IDs instead of emails
- Consider IP hashing for GDPR compliance
- Implement key expiration policies

## Performance Impact

### Redis Overhead

- **Latency:** ~2-5ms per request (local Redis)
- **Network:** ~10-20ms per request (Redis Cloud)
- **Memory:** ~100 bytes per rate limit key
- **Throughput:** 100,000+ requests per second

### Optimization Tips

1. **Use Connection Pooling:** Already configured in Redis client
2. **Pipeline Operations:** Consider for high-traffic endpoints
3. **Monitor Memory:** Set Redis maxmemory policy
4. **Use TTL:** Automatic key expiration prevents memory bloat

## Migration from In-Memory

### Previous Implementation

The old in-memory rate limiting (removed):

```javascript
// OLD: In-memory rate limiting
const loginAttempts = new Map();
const MAX_LOGIN_ATTEMPTS = 5;
```

### Migration Steps

1. **Install Dependencies:** Completed
   ```bash
   npm install redis rate-limiter-flexible
   ```

2. **Update Routes:** Completed
   - Replaced in-memory middleware with Redis-backed
   - Updated auth endpoints
   - Applied rate limiting to all API routes

3. **Configure Redis:** Required
   - Set `REDIS_HOST` and `REDIS_PORT`
   - Configure `REDIS_PASSWORD` for production
   - Test connection

4. **Verify Functionality:** Recommended
   - Test login rate limiting
   - Test API rate limiting
   - Verify Redis keys are created

## Summary

The Nerion API rate limiting system provides:

- **Distributed rate limiting** via Redis backend
- **Multiple strategies** for different endpoint types
- **Graceful fallback** to in-memory if Redis unavailable
- **Standard headers** for rate limit information
- **Production-ready** configuration for Redis Cloud
- **Comprehensive monitoring** and health checks
- **Flexible customization** for endpoint-specific needs

For questions or issues, refer to the troubleshooting section or check the logs.
