# Systema Solera

Systema Solera is a cinematic Next.js model-launch surface for a fictional Sol, Terra, and Luna model family. The homepage presents the models as live celestial cards, then opens each one into an immersive WebGL scene with orbital controls, pricing, and real astronomical scale references.

Systema Solera is not affiliated with OpenAI.

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

## Project Notes

- `PRODUCT.md` describes the product intent and audience.
- `DESIGN.md` documents the visual system, motion rules, and layout constraints.
- `public/textures/solera/ATTRIBUTION.md` documents texture sources and usage notes.
- `.env.example` is intentionally empty because the app has no required local secrets.

## Quality Bar

Before merging meaningful UI or rendering changes, run:

```bash
npm run typecheck
npm run test:run
npm run e2e
```

For visual work, also check the homepage and at least one immersive scene at desktop and mobile widths.
