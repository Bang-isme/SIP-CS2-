# Decision: Quota-Aware Auth Session Behavior

Date: 2026-04-03
Status: accepted

## Context

The live MongoDB cluster was over its storage quota. Reads still worked, but token writes failed with error code `8000`.

That created a misleading auth flow:

- `POST /auth/signin` could still validate credentials and return a JWT
- token persistence failed silently under quota handling
- `GET /auth/me` then rejected the brand-new token as revoked because it was never stored

This made the demo account appear wrong even though the credentials were valid.

## Decision

1. Make signin quota-aware.
2. If token persistence fails because Mongo is over quota and `ALLOW_STATELESS_JWT_FALLBACK=0`, return:
   - `503`
   - `code=AUTH_SESSION_STORAGE_UNAVAILABLE`
   - a message that explains the operator choices clearly
3. If `ALLOW_STATELESS_JWT_FALLBACK=1`, allow signin to continue and mark the response as `meta.sessionMode=statelessFallback`.
4. Extend `verifyToken` so stateless fallback also works when the JWT is valid but not present in persistent token storage.

## Why

- A clear failure is more reliable than a false success.
- The fallback mode remains explicit and opt-in.
- This preserves the stricter token-revocation model by default while still supporting read-only demo recovery when Atlas quota blocks writes.

## Consequences

Positive:
- Demo credential failures are now explainable from the API response itself.
- Operators can choose between strict session persistence and temporary read-only fallback.
- FE no longer gets stuck in the confusing "login looked successful but session immediately expired" state.

Trade-off:
- Stateless fallback weakens revocation guarantees and should stay off unless the team explicitly accepts that mode for demo/read-only operation.

## Evidence

- `src/controllers/auth.controller.js`
- `src/middlewares/authJwt.js`
- `src/__tests__/auth.signin.security.test.js`
- `src/__tests__/auth.guard.contract.test.js`
