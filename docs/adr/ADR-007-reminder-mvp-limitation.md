# ADR-007: Reminder MVP Limitation

## Status

Accepted on 6 August 2026 by the Product Owner.

## Context

The browser Notification API cannot guarantee background delivery after the
browser and application are closed. The MVP must not promise a capability it
does not operate.

## Decision

- Store schedules on the server with an IANA timezone and deduplicated
  occurrences.
- Request notification permission only after an explicit user action.
- While the app is active, use browser notification and in-app due-reminder
  feedback on a best-effort basis.
- Keep adherence and calendar functionality available when permission is denied.
- Clearly disclose that closed-browser delivery is not guaranteed.
- Defer service-worker push, queue/retry, delivery receipts, external channels,
  and persisted notification history.

## Consequences

- The MVP remains truthful and operationally simple.
- Reminder effectiveness depends on an active browser; dashboard fallback is
  mandatory.
- Product metrics must not interpret scheduled reminders as delivered messages.

## Reconsider When

Background delivery becomes a requirement with explicit consent, privacy,
queue, retry, observability, and provider acceptance criteria.
