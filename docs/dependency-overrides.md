# Dependency Overrides Documentation

This document documents each dependency override in `package.json` and its rationale.

## Overview

The project uses npm's `overrides` feature to pin specific versions of transitive dependencies. This is done to:
- Fix security vulnerabilities
- Resolve compatibility issues between packages
- Ensure consistent behavior across the dependency tree

## Current Overrides

```json
"overrides": {
  "tar": "^7.5.19",
  "dompurify": "^3.4.9",
  "isomorphic-dompurify": "^3.4.9",
  "@babel/core": "^7.29.6",
  "brace-expansion": "^5.0.8",
  "js-cookie": "^3.0.7",
  "@clerk/shared": {
    "js-cookie": "^3.0.7"
  },
  "json-2-csv": "^5.5.11",
  "vite": "^7.3.6",
  "undici": "^7.28.0",
  "postcss": "^8.5.12",
  "js-yaml": "^4.3.0",
  "uuid": "^11.1.1",
  "serialize-javascript": "^7.0.3",
  "sharp": "^0.35.3",
  "adm-zip": "^0.6.0",
  "skills": "npm:@skills/package@^1.5.20"
}
```

## Individual Override Rationales

### tar ^7.5.19
**Category:** Security
**Rationale:** Addresses known security vulnerabilities in older tar versions. The tar package is used by npm and various build tools.

### dompurify ^3.4.9
**Category:** Security
**Rationale:** Security fix for DOMPurify, used for HTML sanitization. Ensures protection against XSS vulnerabilities.

### isomorphic-dompurify ^3.4.9
**Category:** Security/Compatibility
**Rationale:** Aligns with dompurify version for consistent sanitization behavior across server and client environments.

### @babel/core ^7.29.6
**Category:** Compatibility
**Rationale:** Ensures consistent Babel transpilation behavior across the dependency tree. Prevents version mismatches that can cause build failures.

### brace-expansion ^5.0.8
**Category:** Security
**Rationale:** Security fix for brace-expansion, used by various tools for pattern matching.

### js-cookie ^3.0.7
**Category:** Security
**Rationale:** Security fix for js-cookie library, used for cookie management.

### @clerk/shared → js-cookie ^3.0.7
**Category:** Security/Compatibility
**Rationale:** Ensures Clerk's shared package uses the secure js-cookie version. Clerk is an auth provider (legacy, now using Supabase).

### json-2-csv ^5.5.11
**Category:** Compatibility
**Rationale:** Ensures consistent JSON-to-CSV conversion behavior across the dependency tree.

### vite ^7.3.6
**Category:** Compatibility
**Rationale:** Pins Vite version for consistent build tool behavior. Used by various dev tools and plugins.

### undici ^7.28.0
**Category:** Security/Compatibility
**Rationale:** Security fix and compatibility for undici (HTTP client). Used by Node.js fetch implementation and various packages.

### postcss ^8.5.12
**Category:** Compatibility
**Rationale:** Ensures consistent PostCSS version for CSS processing. Critical for Tailwind CSS and other PostCSS plugins.

### js-yaml ^4.3.0
**Category:** Security
**Rationale:** Security fix for js-yaml, used for YAML parsing in configuration files.

### uuid ^11.1.1
**Category:** Security
**Rationale:** Security fix for UUID generation library, used throughout the application for ID generation.

### serialize-javascript ^7.0.3
**Category:** Security
**Rationale:** Security fix for JavaScript serialization, used for safe serialization of objects (e.g., in SSR).

### sharp ^0.35.3
**Category:** Compatibility
**Rationale:** Ensures consistent sharp version across the dependency tree. Sharp is a native module; version mismatches can cause build failures.

### adm-zip ^0.6.0
**Category:** Security
**Rationale:** Security fix for adm-zip, used for ZIP file operations in various scripts.

### skills → npm:@skills/package@^1.5.20
**Category:** Compatibility
**Rationale:** Ensures the skills package uses the correct npm package name and version. Skills is used for AI agent capabilities.

## Maintenance Guidelines

### When to Add New Overrides

1. **Security Vulnerabilities:** When `npm audit` reports a vulnerability that cannot be fixed by updating direct dependencies
2. **Compatibility Issues:** When two packages require incompatible versions of a shared dependency
3. **Build Failures:** When transitive dependency mismatches cause build or runtime errors

### When to Remove Overrides

1. When direct dependencies are updated to versions that no longer require the override
2. When the overridden package is no longer in the dependency tree
3. When the issue the override was meant to fix is resolved in newer versions

### Testing After Changes

After modifying overrides:
1. Run `npm ci` to ensure clean install
2. Run `npm run build` to verify build succeeds
3. Run `npm test` to ensure tests pass
4. Run `npm audit` to check for new vulnerabilities
5. Test the application locally to verify runtime behavior

### Audit Process

Quarterly, review all overrides:
1. Check if each override is still necessary
2. Verify if newer versions of overridden packages are available
3. Test removing overrides one at a time
4. Update documentation with any changes

## Security Considerations

- Overrides should be used sparingly and only when necessary
- Each override should have a documented rationale
- Security-related overrides should be prioritized for updates
- Regular security audits should include review of overrides

## References

- [npm overrides documentation](https://docs.npmjs.com/cli/v9/configuring-npm/package-json#overrides)
- [npm audit documentation](https://docs.npmjs.com/cli/v9/commands/npm-audit)
- [Security advisories database](https://github.com/advisories)

## Last Updated

2026-08-03 - Initial documentation of all overrides in package.json
