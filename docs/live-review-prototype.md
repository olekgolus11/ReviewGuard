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

Open `http://localhost:3000/workspace`, paste a Google Maps place URL (including a `maps.app.goo.gl` shortlink), and import up to 200 reviews. The default is 50. The scraper expands review text, selects newest sorting when available, and reports the observed order and coverage; it does not claim complete coverage unless the count can be confirmed. A blocked browser, unresolved consent screen, missing place or empty extraction is an error, never a fixture fallback. Google may restrict an invisible browser to a limited guest view; the importer then retries once in a temporary visible browser and closes it afterward. No existing browser profile, Google account or stored user cookies are used. This retry requires a desktop display (or Xvfb on Linux).

On Linux install browser system dependencies with `pnpm exec playwright install --with-deps chromium`. An existing Chromium can be selected with `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` if needed.

## Review workflow

Import automatically classifies reviews before returning the workspace. The default queue shows reply, human-review and report actions together. Enable “Uwzględnij pominięte” to include skipped reviews; the rating filter applies to either view. Inspect the suggested actions and reasons, and add factual manager context where requested. Successful assessments are persisted individually; missing configuration, provider failures or an execution deadline preserve the imported source and expose incomplete classification with a retry. Existing workspaces refresh assessments from an older policy on opening. Reply suggestions use `openai/gpt-6-luna`; triage uses `typesafe-ai/jev`. Possible violations and useful-response signals are independent even though the queue shows one primary action. The initial probability thresholds are conservative routing heuristics, not validated accuracy. Potential violations always require human verification.

Review source links use a stored Google review permalink or derive one from the original Google review identity and place CID. The canonical URL was verified against Google’s Share link and two previously imported reviews. New imports persist these links; existing snapshots use the same derivation in the UI without another import. Records with unsupported identifiers fall back to an explicitly labelled place link. Reviewer profile links are not treated as review permalinks. Ordinary imports never use the system clipboard.

Edit generated replies, save them, and copy them for manual publication. The app does not establish that allegations are true and does not invent corrective action or compensation.

## Classifier regressions

Run `pnpm eval:classifier` with the Gateway key configured. The [Promptfoo suite](classifier-evaluation.md) exercises production classification and the captured contradictory reply/usefulness routing case. These synthetic development cases are regression checks; they do not establish accuracy on independent human-labelled reviews.

## Backtest

For independent reference labels, first freeze a workspace JSON export and use the [local blind labeller](validation/blind-review-labeler.md). Run `node tools/blind-review-labeler/server.mjs` and open its localhost address. It hides model predictions and retains source-bound labels with an explicit development or held-out split. Compare its label export with the unchanged workspace export using the [offline evaluator](backtest-evaluation.md): `node tools/evaluate-backtest.mjs frozen-export.json reference-labels.json > evaluation-report.json`.

Prefer two independent human labellers and reconcile disagreements before evaluation. Record the reference action separately from the model prediction. Use different reviews for prompt/rule tuning and final held-out evaluation. Test ordinary reviews and a deliberately described difficult-case sample: blank ratings, praise, complaints, mixed ratings/text, irony, serious incidents, policy concerns and already-answered reviews.

The report uses only reviews with both a reference label and model assessment. Rows are reference actions; columns are model predictions. It shows sample size, missing assessments, accuracy and precision/recall per action; undefined metrics stay undefined, rather than being presented as perfect results. Reply quality requires separate human assessment of factual grounding, specificity, tone, privacy and unsupported promises.

Export JSON to freeze the current review snapshot, current-policy assessments with model/policy version, original generated reply text alongside human edits, and independent reference labels. Re-importing unchanged reviews retains work; changed review content or a different location invalidates the associated assessments, replies and reference labels. Original import snapshots are also retained on the server.

## Storage and hosting

A random HttpOnly, SameSite cookie selects the browser's workspace. Data is saved atomically under `.reviewguard-data/` by default; `REVIEWGUARD_DATA_DIR` can point to a private persistent volume. The directory is ignored by Git. This is a single-process prototype with no user accounts; do not expose the AI-enabled endpoints as an unrestricted public service. Losing the browser cookie loses access to that workspace in the UI.

Default Vercel function filesystems are not a durable store, and a browser scraper needs a suitable runtime. For a shared remotely hosted prototype, run the Next Node server on a host with Chromium and a persistent private volume, or replace the file store and move import execution to a worker. Both can remain in this repository; an `app` subdomain does not require a separate repository.
