# @booklet/content-schema

Framework-free runtime contract for versioned booklet page JSON. Consumers pass
untrusted input to `parsePageDocument` or `safeParsePageDocument` and receive
project-owned readonly types; Zod remains an implementation detail.

Version 1 supports the ten MVP block variants defined by the PRD. It accepts
plain text, allowlisted layout/design tokens, stable typed references, and HTTPS
external links only. Internal reader navigation is a separate logical-page
contract, not an overloaded URL block. HTML-looking strings in text fields remain
inert plain text and must never be interpreted as markup by a renderer. The
schema does not accept executable configuration, arbitrary CSS properties,
media URLs, or embedded domain records.

Image and video blocks require an integer `aspectRatio` width and height between
1 and 10,000. This fixed geometry lets the reader reserve media space inside the
portrait page before the asset loads. Public ID and HTTPS URL constructors are
the only supported way for authored TypeScript to obtain the corresponding
branded values.

The single v1 page preset is `portrait`. Landscape in the MVP architecture is a
reader spread/orientation concern owned by the flipbook adapter, not persisted
page styling. The PRD's combined `button/link` capability is represented by one
`button-link` discriminant with an allowlisted `appearance` value.

## Compatibility boundary

`schemaVersion: 1` is the first published schema. Version 0 is an explicit
pre-publication draft/import compatibility envelope; it is not fabricated
published history. `safeMigratePageDocument` and `migratePageDocument` apply
only registered adjacent steps. They never skip a version, downgrade a
document, mutate caller input, or return content before strict current-schema
validation. The per-block v0-to-v1 registry is exhaustive for the ten known MVP
block types.

Publication remains strict: `safeParsePageDocument` rejects every unknown block
type. The reader-only `safePreparePageDocumentForReader` boundary is forward
tolerant. It replaces a structurally valid, truly unknown block with an inert
`unknown-block` record and returns separate typed evidence for observability.
The fallback retains only its validated unique block ID and a bounded safe type
label. The original positive bounded version and source index exist only in the
separate `UnknownBlockEvidence` record. Unknown props are discarded.
The unknown envelope itself is strict and permits only `id`, `type`, `version`,
and `props`; extra top-level fields, known-but-malformed blocks, and malformed
unknown envelopes are rejected rather than disguised as fallbacks. The current
100-block page limit applies to the complete source list, including unknown
blocks. Both safe and throwing preparation APIs return the typed evidence. This
package does not own a logger or any React rendering behavior.
