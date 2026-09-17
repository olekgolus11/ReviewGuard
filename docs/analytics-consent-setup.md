# Production analytics dashboard and verification

This is the production runbook for ReviewGuard's one analytics surface: the PostHog dashboard **`MVP — consented anonymous sessions`**. It deliberately describes consented anonymous sessions, not people or all visitors. Do not create a second MVP dashboard, send a project API secret to the browser, add a different CMP, or enable a paid Cookiebot plan as part of this runbook.

## Who does what

| Step | Owner | Evidence to retain |
| --- | --- | --- |
| Check the current Cookiebot Free allowance and create/configure the domain group | Product owner | Dated screenshot or exported plan/domain view |
| Approve the Polish and English privacy wording | Human legal reviewer | Reviewer name, date, and the two approved URLs |
| Create the PostHog Cloud EU project, configure retention, and build the dashboard | Product owner with PostHog access | Project region, retention setting, dashboard URL, and screenshots |
| Set production build variables and deploy | Release owner | Deployment ID and a redacted variable-name check |
| Exercise the browser, inspect requests, and inspect the received events | Product owner or release tester | Filled verification record below |
| Verify the event contract and fail-closed behavior in this repository | Agent | Passing automated checks |

An agent can verify the checked-in event contract and the deployed browser behavior, but cannot accept Cookiebot terms, select a plan, provide credentials, alter a DNS/domain configuration, or perform legal review. Those are intentional owner gates.

## Stop gate: Cookiebot Free allowance

Before enabling analytics, the product owner must run or refresh Cookiebot's production-domain scan for `reviewguard.pl`, retain its result, then open the current Cookiebot account's **Free** plan/usage view. Record the scan's domain/page scope, the allowance shown by the plan, and the amount already in use.

| Check | Pass condition | If it fails |
| --- | --- | --- |
| Production scan and Free allowance | The completed `reviewguard.pl` scan is within the displayed Free allowance; `www.reviewguard.pl` is included only when it serves this app | Stop. Do not enable PostHog, upgrade Cookiebot, buy a plan, or replace Cookiebot with another CMP. Record the constraint and return it to the product owner. |
| Domain scope | No localhost or preview hostname is in the production group | Remove the non-production hostname before continuing. |

Only after both checks pass may the rollout proceed. This prevents analytics from being enabled in a configuration whose consent boundary is not licensed for the production domain.

## Provision Cookiebot

1. Register `reviewguard.pl` as the production domain. Add `www.reviewguard.pl` only if it also serves the production application.
2. Add Polish and English content variants. The application fixes `data-culture` to `PL` on `/pl` routes and `EN` on English routes.
3. Select **Explicit Consent**, distribute to **All visitors**, and use **Multilevel** with **Reject all / Selection / Allow all**.
4. Leave Preferences, Statistics, and Marketing unchecked by default. Necessary may remain selected because it is not optional.
5. Give Reject all, Selection, and Allow all equal visual weight: comparable contrast and the same solid/outline treatment. Reject must not be a less-visible text link.
6. Set consent expiration to **six months**, save, and publish. Recheck this after each consent-template change.
7. Allow Statistics only for PostHog. Do not use this consent for advertising or person profiling.
8. Put the domain-group ID, and only that public identifier, in the production build as `NEXT_PUBLIC_COOKIEBOT_DOMAIN_GROUP_ID`.

The checked-in integration disables Google Consent Mode and does not rely on automatic blocking. It starts PostHog only after Cookiebot reports affirmative `consent.statistics`; rejecting or withdrawing consent stops it. The application remains usable if Cookiebot is blocked or missing.

## Provision PostHog Cloud EU

1. Create or select a **Cloud EU** project. Record the region in the evidence log.
2. Set event retention to **12 months**. Record the setting and date; this is an owner action because plan controls can change.
3. Copy the project's public client key only into the production build as `NEXT_PUBLIC_POSTHOG_KEY`. Never put a personal API key, project API secret, or any server credential in a `NEXT_PUBLIC_*` variable.
4. Do not alter the ingestion host: the application is restricted to `https://eu.i.posthog.com`.
5. Leave person profiles, `identify`, autocapture, automatic page events, recordings, surveys, flags, experiments, performance, exceptions, heatmaps, dead clicks, campaign/referrer collection, and persistent identity disabled. The transport also strips SDK-added URL, referrer, browser, device, and session properties before sending.

`NEXT_PUBLIC_*` values are embedded at build time by Next.js, so set the two public variables in the environment that builds the production artifact; changing them after the build does not change the browser bundle.

## Build exactly one reproducible dashboard

Create one PostHog dashboard named **`MVP — consented anonymous sessions`**. Set its timezone to the business reporting timezone and its default date range to the last 30 complete days. Every tile title must start with `Consented anonymous sessions —` (except raw event-count tiles, which must say `Consented anonymous events —`) so no one reads it as all traffic or identified users.

For every unique-session query, use PostHog's unique `distinct_id` aggregation. In this application that ID is a per-tab, anonymous `sessionStorage` identifier; it is not a person. Use the same 30-day range and the same dashboard-wide filters for all tiles.

| Tile title | Insight/query | Breakdown or calculation |
| --- | --- | --- |
| Consented anonymous sessions — over time | Trend: `landing_page_viewed` and `demo_opened`, unique `distinct_id` | Daily; show the two events separately. |
| Consented anonymous sessions — locale | Trend: `landing_page_viewed`, unique `distinct_id` | `locale`. |
| Consented anonymous sessions — source | Trend: `landing_page_viewed`, unique `distinct_id` | `utm_source`, with missing shown as `(none)`. |
| Consented anonymous sessions — campaign | Trend: `landing_page_viewed`, unique `distinct_id` | `utm_campaign`, with missing shown as `(none)`. |
| Consented anonymous sessions — device | Trend: `landing_page_viewed`, unique `distinct_id` | `device_class`, with missing shown as `(none)`. |
| Consented anonymous sessions — landing to demo rate | Funnel: `landing_page_viewed` then `demo_opened` | Ordered, same-session conversion; display step conversion and label its denominator `consented anonymous sessions that viewed landing`. |
| Consented anonymous sessions — meaningful demo rate | Funnel: `review_opened` then any of `reply_edited`, `reply_approved`, `reply_copied`, or `prepared_reply_variant_selected` | Ordered, same-session conversion. This is the definition of a Meaningful demo session: a review is opened, then a qualifying reply action occurs. Label the denominator `consented anonymous sessions that opened a review`. |
| Consented anonymous sessions — acquisition funnel | Funnel: `landing_page_viewed` then `demo_opened` then `lead_form_viewed` | Ordered, same-session. Label the first-step denominator `consented anonymous sessions that viewed landing`. |
| Consented anonymous sessions — activation funnel | Funnel: `demo_opened` then `review_opened` then any of `reply_edited`, `reply_approved`, `reply_copied`, or `prepared_reply_variant_selected` | Ordered, same-session. Label the first-step denominator `consented anonymous sessions that opened demo`. |
| Consented anonymous sessions — demo lead conversion | Formula: unique `lead_submitted` ÷ unique `demo_opened` × 100 | This is aggregate accepted-lead conversion. Label the denominator `consented anonymous sessions that opened demo`. It is not strict-funnel completion: it does not require the ordered acquisition steps. |
| Consented anonymous events — feature actions | Trend: `review_opened`, `reply_edited`, `reply_approved`, `reply_copied`, and `prepared_reply_variant_selected`, total event count | Daily; each series is a feature-action count. |
| Consented anonymous sessions — feature actions | Same five events, unique `distinct_id` | Daily; this is the session count counterpart, not the raw count. |
| Consented anonymous events — actions by rating | Trend of the four reply-action events, total event count | `rating`. |
| Consented anonymous events — actions by category | Trend of the four reply-action events, total event count | `review_category`. |

Do not add an event property, a person property, a cohort, or a dashboard filter that contains lead-form fields, names, email addresses, URLs, IP addresses, full referrers, or other PII. `lead_submitted` means the server accepted delivery to the notification service; it contains no form fields. Keep **product-success targets unset** until at least 30 consented anonymous sessions have produced `demo_opened`; record the count and the decision when that threshold is reached.

## Controlled production QA

Use a fresh browser profile for each consent state. In the browser network panel, preserve the request log and filter for `posthog`, `eu.i.posthog.com`, and `cookiebot`. Never paste production public keys or full payloads into an issue; redact them.

| Case | Procedure | Required result and evidence |
| --- | --- | --- |
| English consent and acquisition funnel | Visit `/`, reject, then repeat in a fresh profile and accept Statistics. With consent, complete landing → demo → lead form; submit only a safe test lead through the normal configured notification path. | English banner has equal accept/reject prominence and no optional category preselected; no PostHog before reject, then only allowlisted events after accept. Screenshot the ordered funnel events and dashboard result. |
| Polish consent and activation funnel | Visit `/pl` in a fresh profile, accept Statistics, open demo, open a review, then edit/approve/copy/select a prepared variant. | Polish banner has equal accept/reject prominence and no optional category preselected; `demo_opened`, `review_opened`, then qualifying reply action with `locale: pl`, rating, and category. Screenshot the ordered events and dashboard result. |
| Withdrawal in both locales | On both `/` and `/pl`, accept Statistics, reopen **Analytics settings** from both the landing and public-demo footers, and withdraw. | No subsequent PostHog request; session identity is cleared in each locale. |
| Rejection and no choice | Reject, and separately leave the banner unanswered. Exercise navigation, demo, clipboard copy, and lead form. | All product functions work; zero PostHog requests. |
| Cookiebot failure | Block `consent.cookiebot.com`; repeat navigation, demo, clipboard copy, and lead submission. | Product remains usable. The settings action may do nothing but must not throw or block the interface; zero PostHog requests. |
| PostHog failure | Block `eu.i.posthog.com`; perform both funnels and copy a reply. | Landing, demo state, clipboard behavior, navigation, and lead submission remain usable. |
| Non-production and opt-out | Check preview, localhost, a production browser with the opt-out set, and a build without `NEXT_PUBLIC_POSTHOG_KEY`. | Zero PostHog requests in every case. |
| Payload allowlist and privacy | After consent, inspect all received event names/properties and the dashboard's event/property explorer. | Only these event names: `landing_page_viewed`, `demo_opened`, `review_opened`, `reply_edited`, `reply_approved`, `reply_copied`, `prepared_reply_variant_selected`, `lead_form_viewed`, `lead_submitted`. Properties are limited to locale/page kind, permitted acquisition fields, review ID/rating/category, action kind, `meaningful_demo_action` on accepted leads, and the anonymous session identity. Verify rating/category are only the fictional demo-fixture taxonomy (`quick`, `personalize`, `caution` and their fixed ratings), never source-review content. No development traffic and no PII. |

### Device-local team opt-out

Before using production as a team member, set this browser-local value in the browser console:

```js
localStorage.setItem("reviewguard.analytics.team-opt-out", "true")
```

Verify that the consented page creates no PostHog request, then retain a screenshot of the network result. Remove the value only when deliberately testing consented traffic. If local storage is blocked, analytics fails closed.

## Production evidence record

Complete this record in the release ticket or private release log; an unchecked item blocks declaring production verification complete.

| Item | Owner | Evidence link or reference | Complete |
| --- | --- | --- | --- |
| Production Cookiebot scan, Free allowance, and domain scope checked | Product owner |  | [ ] |
| Cookiebot group published: locales, equal choices, no preselection, six-month renewal | Product owner |  | [ ] |
| Bilingual privacy wording legally approved | Legal reviewer |  | [ ] |
| Cloud EU project and 12-month retention confirmed | Product owner |  | [ ] |
| Only public build variables set and production deployment identified | Release owner |  | [ ] |
| One named dashboard built with every tile above | Product owner |  | [ ] |
| English and Polish QA, both funnels, and expected properties checked | Release tester |  | [ ] |
| No development traffic or PII found | Release tester |  | [ ] |
| Reject, withdrawal, Cookiebot failure, and PostHog failure checks passed | Release tester |  | [ ] |
| Device-local team opt-out checked | Release tester |  | [ ] |
| Product-success targets remain unset, or 30-session threshold decision recorded | Product owner |  | [ ] |

Production analytics is verified only when every row is checked. Until then, this document is a release plan, not evidence that an external account or legal review has been completed.
