# Review classification and reply generation with AI Gateway

Research checked 1 October 2026 against Vercel's official documentation and model pages.

## Integration facts

AI SDK 7 exposes Jev through the experimental `experimental_evaluate` API. The call accepts a model identifier, shared `state`, and a map of named typed questions. Jev answers choice questions with the selected choice and optional per-choice probabilities, and boolean questions with a probability. The API is experimental, so changes to its contract should be checked when upgrading the SDK. The review classifier uses `typesafe-ai/jev` and asks separately for the next action, context need, reply usefulness, serious incident, and possible policy concern/category. Application reasons are mapped from those evaluated criteria and deterministic facts; Jev is not asked to write prose.

Vercel AI Gateway documents `openai/gpt-6-luna` with AI SDK `generateText`. Both model calls use `AI_GATEWAY_API_KEY` server-side and fail visibly when it is not configured. The implementation does not select a fallback model. Reply output is constrained to the supplied review, location name/address, and manager context, with untrusted user content explicitly treated as data.

Sources:

- [Use Jev from TypeSafe AI with AI SDK](https://vercel.com/kb/jev-from-typesafe-ai)
- [Jev model on Vercel AI Gateway](https://vercel.com/ai-gateway/models/jev)
- [GPT-6 Luna model on Vercel AI Gateway](https://vercel.com/ai-gateway/models/gpt-6-luna)
- [Vercel AI SDK documentation](https://vercel.com/docs/ai-sdk)

## Product policy applied

The classifier keeps `shouldReply`, `needsContext`, and `potentialViolation` as independent signals. Existing owner replies default to `skip`; blank-star reviews do not receive a fabricated substantive response; low ratings or ordinary criticism do not imply a policy violation. Uncertain choices, serious incident signals, or strong missing-context signals route to `human_review`. A visible possible policy concern may coexist with a reply signal and never asserts that Google will remove the review.

The implementation uses conservative prototype thresholds (0.68 top action probability, 0.15 lead over the next action, and 0.70 signal probability). They are routing controls, not measured confidence or accuracy, and must be revisited against the manually labelled backtest. No acceptance threshold or quality claim is inferred from them.
