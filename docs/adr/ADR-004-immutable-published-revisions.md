# ADR-004: Immutable Published Revisions

## Status

Accepted on 6 August 2026 by the Product Owner.

## Context

Learner progress and active reading sessions must not change when an admin edits
or republishes a booklet.

## Decision

- Draft revisions are mutable; published revisions are immutable snapshots.
- Publish validates schema, references, ordering, and preflight rules, then
  creates and activates the snapshot in a database transaction.
- Progress, quiz triggers, and reading position reference `revisionId` and
  stable `pageId`, never only an engine index.
- Corrections create a new revision; applied production revisions are not edited.

## Consequences

- Active sessions and historical metrics remain reproducible.
- Publishing costs additional storage and explicit migration/version handling.
- Archive and retention policies must preserve required revision integrity.

## Reconsider When

No in-place mutation exception is permitted; a different publication model
requires a replacement ADR and migration plan.
