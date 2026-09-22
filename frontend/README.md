# Kshirsagar Dairy — Distribution Suite (frontend)

React 19 + TypeScript + Vite + MUI. See the [top-level README](../README.md) for
full-stack setup. Quick reference for this package:

```bash
npm install
npm run dev        # http://localhost:5173, proxies /api to VITE_API_PROXY_TARGET
npm run build       # tsc -b && vite build
npm run lint
npm run test         # vitest run
```

Structure: `src/api` (typed HTTP clients), `src/components` (shared UI),
`src/features` (module-specific forms/dialogs), `src/pages` (routed screens),
`src/store` (Zustand), `src/hooks`, `src/theme`, `src/types`.
