# Live review prototype

The marketing site and curated demo are unchanged. The live product is at `/workspace` and uses real imported reviews, Jev through Vercel AI Gateway, and GPT-6 Luna reply suggestions. No reply is published and no report is sent to Google.

## Run locally

Requires Node.js 22 or newer and pnpm.

```sh
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
cp .env.example .env.local
```

Set `AI_GATEWAY_API_KEY` in `.env.local` to a Vercel AI Gateway API key. Never use a public-prefixed variable for this key. Import works independently of AI configuration; classification and generation show an explicit configuration error until the key is set.

```sh
pnpm dev
```

Open `http://localhost:3000/workspace`, paste a Google Maps place URL (including a `maps.app.goo.gl` shortlink), and import up to 200 reviews. The default is 50. The scraper expands review text, selects newest sorting when available, and reports observed coverage; it does not claim complete coverage unless the count can be confirmed. A blocked browser, consent screen, missing place or empty extraction is an error, never a fixture fallback.

On Linux install browser system dependencies with `pnpm exec playwright install --with-deps chromium`. An existing Chromium can be selected with `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` if needed.

## Review workflow

Classify reviews, inspect the suggested action and reasons, and add factual manager context where requested. Reply suggestions use `openai/gpt-6-luna`; triage uses `typesafe-ai/jev`. Possible violations and useful-response signals are independent even though the queue shows one primary action. The initial probability thresholds are conservative routing heuristics, not validated accuracy. Potential violations always require human verification.

Edit generated replies, save them, and copy them for manual publication. The app does not establish that allegations are true and does not invent corrective action or compensation.

## Backtest

Prefer two independent human labellers and reconcile disagreements before evaluation. Record the reference action separately from the model prediction. Use different reviews for prompt/rule tuning and final held-out evaluation. Test ordinary reviews and a deliberately described difficult-case sample: blank ratings, praise, complaints, mixed ratings/text, irony, serious incidents, policy concerns and already-answered reviews.

The report uses only reviews with both a reference label and model assessment. Rows are reference actions; columns are model predictions. It shows sample size, missing assessments, accuracy and precision/recall per action; undefined metrics stay undefined, rather than being presented as perfect results. Reply quality requires separate human assessment of factual grounding, specificity, tone, privacy and unsupported promises.

Export JSON to freeze the current review snapshot, assessments with model/policy version, reply suggestions, and independent reference labels. Re-importing unchanged reviews retains work; changed review content or a different location invalidates the associated assessments, replies and reference labels. Original import snapshots are also retained on the server.

## Storage and hosting

A random HttpOnly, SameSite cookie selects the browser's workspace. Data is saved atomically under `.reviewguard-data/` by default; `REVIEWGUARD_DATA_DIR` can point to a private persistent volume. The directory is ignored by Git. This is a single-process prototype with no user accounts; do not expose the AI-enabled endpoints as an unrestricted public service. Losing the browser cookie loses access to that workspace in the UI.

Default Vercel function filesystems are not a durable store, and a browser scraper needs a suitable runtime. For a shared remotely hosted prototype, run the Next Node server on a host with Chromium and a persistent private volume, or replace the file store and move import execution to a worker. Both can remain in this repository; an `app` subdomain does not require a separate repository.
