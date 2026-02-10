# @luziadev/skill

Claude Code skill for fetching real-time cryptocurrency prices from multiple exchanges via the [Luzia API](https://luzia.dev).

## Install

```bash
npx skills add @luziadev/skill
```

Or via GitHub:

```bash
npx skills add luziadev/skill
```

## What it does

This skill teaches Claude Code how to use the Luzia API to:

- Fetch real-time ticker prices from Binance, Coinbase, Kraken, Bybit, and OKX
- Compare prices across exchanges for arbitrage opportunities
- List available markets and trading pairs
- Stream live prices via WebSocket (Pro tier)
- Use the TypeScript SDK (`@luziadev/sdk`) for type-safe integration

## Configuration

You need a Luzia API key. Get one at [luzia.dev](https://luzia.dev).

Add it to your Claude Code skill config:

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

## Example prompts

- "What's the current Bitcoin price?"
- "Compare ETH prices across exchanges"
- "What trading pairs are available on Binance?"
- "Show me all crypto prices on Coinbase"

## Links

- [Luzia API](https://luzia.dev)
- [TypeScript SDK](https://www.npmjs.com/package/@luziadev/sdk)
- [API Documentation](https://luzia.dev/docs)

## License

MIT
