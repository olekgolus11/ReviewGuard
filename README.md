# ReviewGuard

Marketing site, curated demo, and live Google review prototype in one Next.js repository.

See [live prototype setup and backtest](docs/live-review-prototype.md). Product entry: `/workspace`.

```sh
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm dev
```

For AI, configure `AI_GATEWAY_API_KEY` on the server. Import and AI failures are reported explicitly; no fixture data is substituted.

```sh
pnpm exec tsc --noEmit
pnpm lint
pnpm test
pnpm build
```
