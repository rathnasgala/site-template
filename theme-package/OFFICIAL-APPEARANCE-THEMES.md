# Official appearance theme contract

Official Gala themes are reviewed, CSS-only appearance layers. They do not replace the managed
publication framework: templates, authentication, analytics, JavaScript, security policy, and
publishing workflows continue to come from `@rathnasgala/theme`.

## Repository and release requirements

Each release must be in a public repository owned by the `rathnasgala` GitHub organization. A Gala
ROOT user registers one exact 40-character lowercase commit SHA; branches, moving tags, arbitrary
owners, and `latest` references are not accepted. The commit must contain `gala-theme.json`:

```json
{
  "schemaVersion": 1,
  "id": "quiet-paper",
  "version": "1.2.0",
  "name": "Quiet Paper",
  "description": "A restrained editorial appearance.",
  "framework": {
    "minimumVersion": "2.0.0",
    "maximumVersionExclusive": "3.0.0"
  },
  "css": {
    "path": "theme.css",
    "sha256": "64-lowercase-hexadecimal-characters"
  }
}
```

The manifest accepts exactly these fields. Its CSS path must be a relative, traversal-free `.css`
path. The stylesheet must be valid UTF-8, at most 32 KiB, match the declared SHA-256, and contain
neither `@import` nor `url(...)`. These restrictions keep a selected theme self-contained and stop
it from introducing third-party requests or executable runtime dependencies.

## Selection, builds, and rollback

Selecting a compatible active release writes both the verified stylesheet and its complete
repository/commit/hash pin to the publication in one GitHub commit. The build independently checks
the file size and SHA-256 before linking it after Gala's managed CSS and before the author's
`custom.css`. The selected stylesheet counts against the publication's managed CSS budget.

Retirement prevents new selections but retains the release, its audit history, and existing
publication builds. An author can roll back to another active compatible release or to Gala's
built-in appearance. Returning to the built-in appearance removes the pin in one repository commit;
an unreferenced materialized stylesheet may remain in the repository and is not loaded by the site.
