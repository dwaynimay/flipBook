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

Schema migration and unknown-block fallback policy belong to CON-002 and are
intentionally outside this package version.
