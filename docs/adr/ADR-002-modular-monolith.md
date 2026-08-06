# ADR-002: Modular Monolith

## Status

Accepted on 6 August 2026 by the Product Owner.

## Context

Publishing, progress, quiz, and adherence require strong consistency while the
MVP team needs rapid delivery and simple operations.

## Decision

- Implement the backend as one NestJS modular monolith in `apps/api`.
- Keep business capabilities in explicit modules with controller, application,
  domain policy, and infrastructure responsibilities as needed.
- Keep cross-module transactions inside the monolith and PostgreSQL boundary.
- Do not introduce microservices, Kafka, Kubernetes, or a worker by default.

## Consequences

- Transactions, testing, deployment, and observability stay straightforward.
- Module boundaries remain enforceable without distributed-system overhead.
- Generic repositories and speculative shared services remain prohibited.

## Reconsider When

Extract a worker or service only when measured scaling, isolation, delivery
retries, or independent release requirements justify the operational cost.
