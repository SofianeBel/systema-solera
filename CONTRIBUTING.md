# Contributing

## Workflow

1. Keep changes scoped to the requested behavior.
2. Match the existing React, TypeScript, and CSS style.
3. Update tests when behavior changes.
4. Run the relevant verification commands before opening a pull request.

## Local Setup

```bash
npm install
npm run dev
```

## Verification

Use the smallest check that proves the change, then broaden when the touched surface is shared or user-facing.

```bash
npm run typecheck
npm run test:run
npm run e2e
```

For WebGL or layout changes, verify:

- homepage renders without framework overlays or console errors
- Sol, Terra, and Luna cards open their immersive scenes
- Escape and browser Back return to the grid
- reduced-motion and mobile layouts remain usable

## Commit Guidelines

- Use concise imperative commit messages, for example `Add homepage disclaimer`.
- Do not commit generated output such as `.next/`, `test-results/`, `.qa/`, or local screenshots.
- Do not add new dependencies unless the feature needs them.
- Do not choose or change a software license without explicit project-owner approval.

## Assets

Texture files live under `public/textures/solera/`. Keep source and usage information current in `public/textures/solera/ATTRIBUTION.md` when adding or replacing texture assets.
