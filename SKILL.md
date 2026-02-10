---
name: luzia
description: Get real-time cryptocurrency prices from multiple exchanges via Luzia API
homepage: https://luzia.dev
user-invocable: true
---

# Luzia - Cryptocurrency Price API

Luzia provides real-time cryptocurrency price data aggregated from multiple exchanges (Binance, Coinbase, Kraken, Bybit, OKX) through a unified REST API, WebSocket streaming, and a TypeScript SDK. Use this skill to fetch ticker prices, compare prices across exchanges, and explore available markets.

## Configuration

Before using this skill, you need a Luzia API key. Get one at https://luzia.dev

Set your API key in the skill configuration:
```json
{
  "skills": {
    "entries": {
      "luzia": {
        "enabled": true,
        "env": {
          "LUZIA_API_KEY": "lz_your_api_key_here",
          "LUZIA_BASE_URL": "https://api.luzia.dev"
        }
      }
    }
  }
}
```

## TypeScript SDK

The official SDK (`@luziadev/sdk`) provides a type-safe client with automatic retries, rate limit handling, and WebSocket support.

### Installation

```bash
npm install @luziadev/sdk
# or
bun add @luziadev/sdk
```

### Quick Start

```typescript
import { Luzia } from '@luziadev/sdk'

const luzia = new Luzia({
  apiKey: 'lz_your_api_key',
  // Optional:
  baseUrl: 'https://api.luzia.dev',  // default
  timeout: 30000,                     // default (ms)
  retry: {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    jitter: true,
  },
})

// List exchanges
const exchanges = await luzia.exchanges.list()

// Get a single ticker
const ticker = await luzia.tickers.get('binance', 'BTC/USDT')
console.log(`BTC/USDT: $${ticker.last}`)

// List tickers for an exchange (paginated)
const { tickers, total } = await luzia.tickers.list('binance', { limit: 50 })

// Get specific tickers across exchanges
const { tickers } = await luzia.tickers.listFiltered({
  exchange: 'binance',
  symbols: ['BTC/USDT', 'ETH/USDT'],
})

// List markets with filters
const { markets } = await luzia.markets.list('binance', {
  base: 'BTC',
  quote: 'USDT',
  active: true,
  limit: 100,
})
```

### Error Handling (SDK)

```typescript
import { Luzia, LuziaError } from '@luziadev/sdk'

try {
  const ticker = await luzia.tickers.get('binance', 'BTC/USDT')
} catch (error) {
  if (error instanceof LuziaError) {
    switch (error.code) {
      case 'auth':       // Invalid API key
      case 'rate_limit': // Rate limited (error.retryAfter has seconds to wait)
      case 'not_found':  // Resource not found
      case 'validation': // Invalid parameters (error.details)
      case 'server':     // Exchange temporarily unavailable
      case 'network':    // Network connectivity issue
      case 'timeout':    // Request timed out
    }
  }
}
```

### Rate Limit Info (SDK)

```typescript
const ticker = await luzia.tickers.get('binance', 'BTC/USDT')
const info = luzia.rateLimitInfo
// { remaining, limit, reset, dailyRemaining?, dailyLimit? }
```

The SDK automatically retries on rate limit (429), timeout (408), server errors (500/502/503/504), and network errors. Non-retryable errors (400, 401, 403, 404) are thrown immediately.

## WebSocket (Real-Time Updates)

Stream live ticker updates over WebSocket. Requires **Pro plan or higher**.

### Quick Start (SDK)

```typescript
const luzia = new Luzia({ apiKey: 'lz_your_api_key' })
const ws = luzia.createWebSocket({
  autoReconnect: true,        // default: true
  maxReconnectAttempts: 10,   // default: 10, 0 = infinite
  reconnectDelayMs: 1000,     // default: 1000ms
  maxReconnectDelayMs: 30000, // default: 30000ms
  heartbeatIntervalMs: 30000, // default: 30000ms, 0 = disabled
})

ws.on('connected', (info) => {
  console.log(`Connected (${info.tier}), max subs: ${info.limits.maxSubscriptions}`)
  ws.subscribe(['ticker:binance:BTC/USDT', 'ticker:coinbase:ETH/USDT'])
})

ws.on('ticker', (data) => {
  console.log(`${data.exchange} ${data.symbol}: $${data.data.last}`)
})

ws.on('error', (err) => {
  console.error(`WebSocket error [${err.code}]: ${err.message}`)
})

ws.connect()
```

### Channel Format

- `ticker:{exchange}:{symbol}` - Specific pair (e.g., `ticker:binance:BTC/USDT`)
- `ticker:{exchange}` - All tickers from an exchange (e.g., `ticker:binance`)

### Subscription Management

```typescript
ws.subscribe(['ticker:binance:BTC/USDT', 'ticker:kraken:ETH/USDT'])
ws.unsubscribe(['ticker:binance:BTC/USDT'])
console.log(ws.subscriptions) // ReadonlySet<string>
console.log(ws.state)         // 'disconnected' | 'connecting' | 'connected' | 'reconnecting'
ws.disconnect()               // Graceful close, disables auto-reconnect
```

### WebSocket Events

| Event | Payload | Description |
|-------|---------|-------------|
| `connected` | `{ tier, limits }` | Connection established |
| `ticker` | `{ exchange, symbol, data, timestamp }` | Price update |
| `subscribed` | `{ channel }` | Subscription confirmed |
| `unsubscribed` | `{ channel }` | Unsubscription confirmed |
| `error` | `{ code, message }` | Error occurred |
| `disconnected` | `{ code, reason }` | Connection closed |
| `reconnecting` | `{ attempt, delayMs }` | Reconnect attempt |

### WebSocket Connection Limits

| Tier | Connections | Subscriptions / Connection |
|------|-------------|----------------------------|
| Free | Not available | -- |
| Pro | 5 | 50 |
| Enterprise | 25 | 500 |

### Raw WebSocket Endpoint

```
GET /v1/ws?apiKey=lz_your_api_key
```

Requires WebSocket upgrade. Authentication via `?apiKey=` query param or `Authorization: Bearer` header. Returns `101 Switching Protocols` on success, `401` on auth failure, `403` if tier does not support WebSocket.

## REST API Endpoints

Base URL: `${LUZIA_BASE_URL}/v1` (default: `https://api.luzia.dev/v1`)

All authenticated requests require the header: `Authorization: Bearer ${LUZIA_API_KEY}`

### Get Single Ticker Price

Fetch the current price for a specific trading pair on an exchange.

```
GET /v1/ticker/:exchange/:symbol
```

**Parameters:**
- `exchange` - Exchange identifier (e.g., `binance`, `coinbase`, `kraken`, `bybit`, `okx`)
- `symbol` - Trading pair in format `BASE-QUOTE` (e.g., `BTC-USDT`, `ETH-USD`)
- `maxAge` (query, optional) - Maximum data age in ms (default: 120000)

**Example Request:**
```bash
curl -H "Authorization: Bearer ${LUZIA_API_KEY}" \
  "${LUZIA_BASE_URL}/v1/ticker/binance/BTC-USDT"
```

**Example Response:**
```json
{
  "exchange": "binance",
  "symbol": "BTC-USDT",
  "last": "43250.50",
  "bid": "43249.00",
  "ask": "43251.00",
  "high": "43800.00",
  "low": "42500.00",
  "volume": "12543.234",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Get All Tickers for Exchange

Fetch all available ticker prices from a specific exchange (paginated).

```
GET /v1/tickers/:exchange
```

**Parameters:**
- `exchange` - Exchange identifier
- `limit` (query, optional) - Max results, default 20, max 50
- `offset` (query, optional) - Pagination offset
- `maxAge` (query, optional) - Maximum data age in ms

**Example Request:**
```bash
curl -H "Authorization: Bearer ${LUZIA_API_KEY}" \
  "${LUZIA_BASE_URL}/v1/tickers/binance?limit=50"
```

**Example Response:**
```json
{
  "tickers": [
    {
      "symbol": "BTC-USDT",
      "exchange": "binance",
      "last": "43250.50",
      "bid": "43249.00",
      "ask": "43251.00",
      "volume": "12543.234"
    }
  ],
  "total": 350,
  "limit": 50,
  "offset": 0
}
```

### Get Multiple Tickers (Bulk)

Fetch tickers across exchanges with filtering.

```
GET /v1/tickers
```

**Parameters (all query, optional):**
- `exchange` - Filter by exchange
- `symbols` - Comma-separated symbol list (e.g., `BTC-USDT,ETH-USDT`)
- `limit` - Max results, default 20, max 50
- `offset` - Pagination offset
- `maxAge` - Maximum data age in ms

**Example Request:**
```bash
curl -H "Authorization: Bearer ${LUZIA_API_KEY}" \
  "${LUZIA_BASE_URL}/v1/tickers?exchange=binance&symbols=BTC-USDT,ETH-USDT"
```

### List Supported Exchanges

Get a list of all supported cryptocurrency exchanges. No authentication required.

```
GET /v1/exchanges
```

**Example Request:**
```bash
curl "${LUZIA_BASE_URL}/v1/exchanges"
```

**Example Response:**
```json
{
  "exchanges": [
    { "id": "binance", "name": "Binance", "status": "active" },
    { "id": "coinbase", "name": "Coinbase", "status": "active" },
    { "id": "kraken", "name": "Kraken", "status": "active" },
    { "id": "bybit", "name": "Bybit", "status": "active" },
    { "id": "okx", "name": "OKX", "status": "active" }
  ]
}
```

### List Markets for Exchange

Get all available trading pairs on a specific exchange.

```
GET /v1/markets/:exchange
```

**Parameters:**
- `exchange` - Exchange identifier
- `base` (query, optional) - Filter by base currency (e.g., `BTC`)
- `quote` (query, optional) - Filter by quote currency (e.g., `USDT`)
- `active` (query, optional) - Filter by active status
- `limit` (query, optional) - Max results, default 100, max 100
- `offset` (query, optional) - Pagination offset

**Example Request:**
```bash
curl -H "Authorization: Bearer ${LUZIA_API_KEY}" \
  "${LUZIA_BASE_URL}/v1/markets/binance?quote=USDT"
```

**Example Response:**
```json
{
  "exchange": "binance",
  "markets": [
    { "symbol": "BTC-USDT", "base": "BTC", "quote": "USDT", "active": true },
    { "symbol": "ETH-USDT", "base": "ETH", "quote": "USDT", "active": true }
  ],
  "total": 2,
  "limit": 100,
  "offset": 0
}
```

## Usage Examples

When users ask about cryptocurrency prices, use the Luzia API:

### "What's the current Bitcoin price?"

1. Fetch from Binance (most liquid):
   ```
   GET ${LUZIA_BASE_URL}/v1/ticker/binance/BTC-USDT
   Headers: Authorization: Bearer ${LUZIA_API_KEY}
   ```

2. Report the price with bid/ask spread

### "Compare ETH prices across exchanges"

1. Fetch from multiple exchanges in parallel:
   ```
   GET ${LUZIA_BASE_URL}/v1/ticker/binance/ETH-USDT
   GET ${LUZIA_BASE_URL}/v1/ticker/coinbase/ETH-USD
   GET ${LUZIA_BASE_URL}/v1/ticker/kraken/ETH-USD
   ```

2. Present a comparison table showing price differences and arbitrage opportunities

### "What trading pairs are available on Coinbase?"

1. Fetch markets:
   ```
   GET ${LUZIA_BASE_URL}/v1/markets/coinbase
   ```

2. List the available pairs, optionally filtered by base currency

### "Show me all crypto prices on Binance"

1. Fetch all tickers:
   ```
   GET ${LUZIA_BASE_URL}/v1/tickers/binance?limit=50
   ```

2. Present as a formatted table sorted by volume or change

### "Stream real-time BTC prices" (SDK only)

```typescript
const luzia = new Luzia({ apiKey: 'lz_your_api_key' })
const ws = luzia.createWebSocket()
ws.on('connected', () => ws.subscribe(['ticker:binance:BTC/USDT']))
ws.on('ticker', (data) => console.log(`$${data.data.last}`))
ws.connect()
```

## Rate Limits

Luzia enforces rate limits based on your subscription tier:

| Tier | Price | Requests/Minute | Requests/Day | WebSocket |
|------|-------|-----------------|--------------|-----------|
| Free | Free | 100 | 5,000 | No |
| Pro | $22.99/mo | 1,000 | 20,000 | Yes |

Rate limit headers are included in all responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704067260
Retry-After: 30  (only on 429)
```

If you receive a 429 response, wait for the `Retry-After` duration before retrying.

## Error Handling

| Status | Meaning |
|--------|---------|
| 200 | Success |
| 400 | Invalid request (check symbol format) |
| 401 | Invalid or missing API key |
| 403 | Feature not available for your tier |
| 404 | Exchange or symbol not found |
| 429 | Rate limit exceeded |
| 503 | Exchange unavailable or stale data |
| 500 | Server error |

## Supported Exchanges

| Exchange | ID | Ticker Pairs |
|----------|----|-------------|
| Binance | `binance` | BTC-USDT, ETH-USDT, ... |
| Coinbase | `coinbase` | BTC-USD, ETH-USD, ... |
| Kraken | `kraken` | BTC-USD, ETH-USD, ... |
| Bybit | `bybit` | BTC-USDT, ETH-USDT, ... |
| OKX | `okx` | BTC-USDT, ETH-USDT, ... |

## Tips

- Symbol format is always `BASE-QUOTE` (e.g., `BTC-USDT`, not `BTCUSDT`)
- Use lowercase for exchange names (e.g., `binance`, not `Binance`)
- The SDK uses `BASE/QUOTE` format (e.g., `BTC/USDT`) while the REST API uses `BASE-QUOTE` (e.g., `BTC-USDT`)
- Cache responses when making multiple requests for the same data
- Compare prices across exchanges to find arbitrage opportunities
- Check the exchanges endpoint first to see which exchanges are currently active
- Use the bulk tickers endpoint (`GET /v1/tickers`) to fetch multiple tickers in a single request
- For real-time streaming, use the WebSocket API via the SDK (Pro tier required)
- The SDK automatically handles retries with exponential backoff for transient errors
