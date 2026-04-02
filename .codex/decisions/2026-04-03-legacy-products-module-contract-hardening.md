# Decision: Legacy Products Module Contract Hardening

Date: 2026-04-03

## Context

The mounted `/api/products` module was still the clearest leftover legacy surface in the backend:
- no dedicated tests
- no OpenAPI coverage
- invalid HTTP semantics (`204` with a response body)
- broken search implementation using malformed aggregation syntax
- no canonical validation/not-found/error contract

Even though this module is outside the CEO Memo dashboard scope, it remains part of the running backend and therefore should not stay as a low-quality exception.

## Decision

Pull `/api/products` onto the same backend contract standard as the rest of the app:
- add `src/utils/productContracts.js`
- rewrite `src/controllers/products.controller.js`
- introduce `canManageProducts` middleware path using moderator/admin/super_admin for create/update, while keeping delete admin-only
- document products in `src/contracts/openapi.contract.js`
- add controller and route authz regressions

## Why

- A backend that claims FE-follow-BE discipline should not keep one mounted legacy module with malformed semantics.
- OpenAPI should describe the real mounted surface area, not only the CEO Memo routes.
- Compatibility modules can stay, but they should be predictable and testable.

## Consequences

Positive:
- Product read/mutation/search endpoints now have canonical validation and error envelopes.
- Search now executes a real bounded regex-based lookup instead of malformed aggregation syntax.
- Update/delete no longer misuse `204`.
- Authz expectations are explicit and regression-tested.

Tradeoff:
- This adds more scope to the OpenAPI contract even though products are not central to the coursework narrative.

## Evidence

- `src/utils/productContracts.js`
- `src/controllers/products.controller.js`
- `src/routes/products.routes.js`
- `src/contracts/openapi.contract.js`
- `src/__tests__/products.controller.behavior.test.js`
- `src/__tests__/products.routes.authz.test.js`
