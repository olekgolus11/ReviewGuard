# Review Management

ReviewGuard helps local businesses prepare timely, high-quality responses to customer reviews. Restaurants are the initial validation segment, not a permanent boundary of the product.

## Language

**Google Business Profile**:
Google's representation of a business in Search and Maps, through which one or more locations and their reviews may be managed.
_Avoid_: Google listing, Google card

**Location**:
A physical place of business represented by a Google Business Profile. A business operator may manage one or many locations.
_Avoid_: Restaurant, venue, branch when referring to the general domain concept

**Restaurant operator**:
A person or organization accountable for review management across one or more restaurant locations. The operator, rather than each individual location, is the unit contacted during validation.
_Avoid_: Restaurant when referring to the prospective customer

**Review owner**:
The person responsible for handling a location's reviews, regardless of whether that person is the restaurant owner, a manager, or a marketing specialist. The product is designed around the responsibility, not the job title.
_Avoid_: Central reviewer, administrator, restaurant owner when the specific role is unknown

**Response style profile**:
The tone and language constraints used to prepare reply suggestions for a location. It is inferred from existing replies for the curated demo, then explicitly configured for a paid pilot using a tone choice and preferred or prohibited phrases.
_Avoid_: AI personality, generic brand voice

**Manager context note**:
A short factual note supplied by the review owner when a difficult review concerns an incident that cannot be understood from the public review alone. It may be used to generate a revised reply suggestion; when it is absent, ReviewGuard keeps the suggestion neutral and does not invent facts.
_Avoid_: Internal investigation, assumed explanation

**Review**:
A customer's rating, optionally accompanied by text, published against a location.
_Avoid_: Post, comment

**Review action recommendation**:
An assessment of the next action for a review: prepare a reply, skip, request human review, or consider reporting a potential policy violation. It includes reasons and does not mean that the action has been completed.
_Avoid_: Review status, sentiment, automatic report

**Live review prototype**:
A workflow that imports a Google Maps location's real reviews, assesses the next action, and prepares editable reply suggestions for copying. It does not verify location ownership or publish replies to Google.
_Avoid_: Curated demo, production dashboard

**Reply suggestion**:
A proposed response to a review that requires human approval before publication.
_Avoid_: Automatic reply, generated description

**Response queue**:
All new reviews awaiting triage or action, grouped into quick approvals, reviews requiring a personalized reply, and reviews requiring caution or possible reporting.
_Avoid_: Negative reviews list, alerts

**Potential policy violation**:
A review containing signals that it may violate Google's content policies. It is an assessment with reasons, not a determination that the review is fake or that Google will remove it.
_Avoid_: Fake review, bot review, violation

**Processed review**:
A review that ReviewGuard has assessed and prioritized, with a reply suggestion added when a response is appropriate. Merely detecting the review does not make it processed.
_Avoid_: Generated reply, detected review

**Rollover balance**:
Unused processed-review allowance carried into a later billing month, capped at twice the standard monthly allowance.
_Avoid_: Unlimited credits, accumulated reviews

**Validation segment**:
The narrow market used to test demand before expanding the product. ReviewGuard's initial validation segment is operators of a single restaurant anywhere in Poland receiving at least 10-15 new reviews per month or carrying at least 20 reviews awaiting a response.
_Avoid_: Permanent target market, product boundary

**Curated demo**:
A product demonstration populated by the ReviewGuard team with real reviews. The generic demo uses 10-12 anonymized reviews from one recognizable restaurant so that its response style remains coherent. For an interested operator, ReviewGuard prepares 10-15 reviews from that operator's location. The customer evaluates the workflow without importing or preparing the source data.
_Avoid_: Self-service onboarding, production dashboard

**Demo review sample**:
The deliberately selected set of 10-12 adapted public reviews from the Pizzeria Kultowa Retkinia profile. It contains four positive quick approvals, three mixed reviews requiring personalization, three negative reviews, one difficult review requiring manager context, and no more than one review marked as a potential policy violation. Categories may overlap. The rating, issue, emotion, and material details are preserved, while identifying details, reviewer names, and avatars are removed.
_Avoid_: Training dataset, complete review history

**Prepared reply variants**:
Two or three reply suggestions authored in advance for a demo review and response style. Regeneration selects another prepared variant within the currently selected style; it never changes the style and does not call an AI model or external service.
_Avoid_: Live generation, production AI integration

**Market offer**:
The pilot scope and price validated for one geographic market. The Polish and English-speaking market offers are tested separately; translating the interface does not carry the Polish price into the English offer.
_Avoid_: Global price, translated Polish offer

**Demo session summary**:
A browser-local summary of reviews opened, edited, approved, and copied, together with an explicitly labelled estimate of time saved. The demonstration assumes six minutes for writing a reply manually and one minute for reviewing a suggestion, giving an estimated five minutes saved per approved reply. It is not remote product analytics and is cleared when the demo is reset.
_Avoid_: Usage analytics, customer report

**Review workflow status**:
The action state of a review in the response queue: new, requires context, ready for approval, or approved. Copying a reply is recorded as a session event and does not create another workflow status.
_Avoid_: Copied status, published status in the demo

**Private demo link**:
An unlisted link, valid for 14 days, to a curated demo prepared only after an interested operator asks to see the workflow on that operator's reviews. It is a later validation tool, not part of the first generic prototype. It is not publicly indexed or reused as the generic showcase.
_Avoid_: User account, permanent public URL

**Generic public demo**:
The first self-guided prototype shared with every visitor. It uses the fictional brand Pizzeria Sasiedzka in Polish and Neighbourhood Pizza in English, and the same fixed adapted demo review sample in both languages. It remains available without an account and does not imply cooperation with the real source restaurant.
_Avoid_: Operator-specific demo, customer portal

**Pilot payment request**:
A payment link or bank-transfer request sent only after ReviewGuard confirms pilot scope and capacity with an interested operator. The generic demo does not contain an embedded checkout.
_Avoid_: Self-service subscription, in-demo checkout

**Demo state**:
Edits, approvals, style choices, and session summary data stored only in the user's browser. The state survives a refresh and can be returned to its initial fixture using the reset-demo action; it is not an account or server-side record.
_Avoid_: Customer account, synchronized data

**Paid pilot**:
A 30-day concierge service in which ReviewGuard prepares reply suggestions and the review owner approves and publishes them. It tests recurring value before production software is built.
_Avoid_: Free trial, one-time audit, production subscription
