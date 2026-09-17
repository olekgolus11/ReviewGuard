# Analytics consent production setup

The application loads Cookiebot only when `NEXT_PUBLIC_COOKIEBOT_DOMAIN_GROUP_ID` is present at build time. Set it to the production Cookiebot domain-group ID. Do not reuse a test group in production.

## Cookiebot domain group

1. Register `reviewguard.pl` as the production domain. Add `www.reviewguard.pl` only if that hostname also serves the production application. Do not add localhost or preview-deployment domains to this group.
2. Add Polish and English content variants. The application fixes `data-culture` to `PL` on `/pl` routes and `EN` on English routes.
3. Use **Explicit Consent**, distribute the banner to **All visitors**, and choose **Multilevel** with **Reject all / Selection / Allow all**.
4. Leave Preferences, Statistics, and Marketing unchecked by default. Necessary may remain selected because it is not optional.
5. Give Reject all, Selection, and Allow all the same visual weight. Use the same solid or outline treatment and comparable contrast; do not make rejection a less-visible link.
6. Set consent expiration to **6 months**, then save and publish the configuration. This overrides Cookiebot's twelve-month default and causes the banner to request a renewed choice after six months.
7. Enable the Statistics category only for PostHog. ReviewGuard does not use consent for advertising or person profiling.
8. Copy the domain-group ID from Cookiebot's script settings into the production build environment as `NEXT_PUBLIC_COOKIEBOT_DOMAIN_GROUP_ID`.

The checked-in script disables Google Consent Mode and deliberately does not rely on Cookiebot automatic blocking. ReviewGuard listens only to Cookiebot's documented consent events and reads affirmative, explicit `consent.statistics` state. It does not initialize PostHog; any future PostHog runtime must use the consent-gated analytics gateway rather than loading as an independently Cookiebot-blocked script.

## Release verification

- Have a human legal reviewer approve both `/privacy` and `/pl/privacy`; the visible draft warning must remain until that approval is complete.
- In a fresh browser profile, confirm that English and Polish banners match the active page language, no optional category is selected, and accept/reject choices have equal prominence.
- Reject or ignore the banner and exercise navigation, the demo, reply copying, and the lead form.
- Accept Statistics, then reopen **Analytics settings** from both the landing-page and public-demo footers and withdraw consent.
- Block `consent.cookiebot.com` and repeat the core-function checks. The footer action may have no effect, but it must not throw or block the interface.
- In Cookiebot, verify the published production domain list and six-month expiration after every consent-template change.
