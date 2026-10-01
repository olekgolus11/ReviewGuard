# Google Maps live import verification

Checked 1 October 2026 against the supplied public Maps link, https://maps.app.goo.gl/iiTFPteqkQf545PH8.

The link resolves to Indian Tadka, Puławska 48, 05-500 Piaseczno, with Google place identifier `0x47192ff9b04916a7:0xe3c0698646711f7b`. The page exposed 676 reviews during this run. This is a live observation, not a fixed fixture or guarantee of future counts.

Bundled Chromium in headless mode served a limited guest view in this environment. A separate temporary visible browser, choosing Google's consent acceptance and opening the actual Reviews tab, exposed the review list. Its sorting menu uses menuitemradio roles; selecting Newest was verified from the control and review ordering. The browser is closed after each attempt. Existing personal profiles, credentials and stored cookies were not accessed.

A newest-five run retained original Polish review text, dates as public relative labels, stable Google review IDs, individual ratings, review-scoped photo references and an existing owner reply. A later requested-50 run retained 40 and marked the result incomplete. The importer now distinguishes its configured scrolling budget from the observed absence of additional cards; a partial sample must not be treated as full history or a representative unbiased benchmark.

Review titles and absolute timestamps are not fabricated when unavailable. A review with no customer text must remain blank even when an owner response exists. Google selectors and access behavior can change; navigation/consent/empty failures are visible errors and never fall back to demo data.
