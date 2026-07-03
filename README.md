# Systema Solera

Systema Solera is a cinematic Next.js launch surface for the GPT-5.6 Sol, Terra, and Luna model family ahead of general public availability. The homepage presents the models as live celestial cards, then opens each one into an immersive WebGL scene with orbital controls, pricing, and real astronomical scale references.

This project treats Sol, Terra, and Luna as a pre-public model lineup, not as fictional placeholders or as models that are currently available to the general public. Systema Solera is not affiliated with OpenAI.

## Stack

- Next.js 16
- React
- TypeScript
- Three.js and `@react-three/fiber`
- Vitest
- Playwright

## Requirements

- Node.js 20 or newer
- npm

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Scripts

```bash
npm run dev        # start the local Next.js dev server
npm run build      # build for production
npm run start      # run the production build
npm run typecheck  # run TypeScript checks
npm run test:run   # run Vitest once
npm run e2e        # run Playwright e2e tests
npm run lint       # alias for typecheck
```

## Solera Live

Solera Live is controlled by a public feature flag and remains disabled by default.

```bash
SOLERA_LIVE_ENABLED=true
ABLY_API_KEY=your-ably-api-key
```

When `SOLERA_LIVE_ENABLED=true` and no `ABLY_API_KEY` is configured, the app uses a local mock realtime adapter so development and tests can run without provider secrets. Real deployment should use Ably token auth through `/api/solera-live/token`; provider keys stay server-only. Reports are written to Netlify Blobs when available and fall back to in-memory storage in plain local development.

## Project Notes

- `PRODUCT.md` describes the product intent and audience.
- `DESIGN.md` documents the visual system, motion rules, and layout constraints.
- `public/textures/solera/ATTRIBUTION.md` documents texture sources and usage notes.
- `.env.example` documents optional Solera Live configuration.

## Quality Bar

Before merging meaningful UI or rendering changes, run:

```bash
npm run typecheck
npm run test:run
npm run e2e
```

For visual work, also check the homepage and at least one immersive scene at desktop and mobile widths.
