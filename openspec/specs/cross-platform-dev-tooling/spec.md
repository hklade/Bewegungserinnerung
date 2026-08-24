# cross-platform-dev-tooling Specification

## Purpose

Guarantees that `npm install` produces a working `node_modules` regardless of which of this repo's two development platforms (Windows host, Linux devcontainer) it was run on, so switching platforms doesn't silently break the dev/build tooling.

## Requirements

### Requirement: npm install resolves native Rollup binaries for both supported platforms
`package.json` SHALL declare the native Rollup binaries for both platforms this repo is developed on (`@rollup/rollup-linux-x64-gnu`, `@rollup/rollup-win32-x64-gnu`) as explicit `optionalDependencies`, so that `npm install` attempts to fetch both regardless of the platform it is invoked from.

#### Scenario: npm install on Linux does not strand a Windows-only node_modules
- **WHEN** `npm install` is run in the Linux devcontainer after `node_modules` was last populated on the Windows host
- **THEN** `@rollup/rollup-linux-x64-gnu` is present in `node_modules` and `npm run dev` / `npm run build` can start Vite successfully

#### Scenario: npm install on Windows does not strand a Linux-only node_modules
- **WHEN** `npm install` is run on the Windows host after `node_modules` was last populated in the Linux devcontainer
- **THEN** `@rollup/rollup-win32-x64-gnu` is present in `node_modules` and `npm run dev` / `npm run build` can start Vite successfully
