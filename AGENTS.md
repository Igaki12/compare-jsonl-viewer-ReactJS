# Repository Guidelines

## Project Structure & Module Organization
- `compare-mcq3-app/` hosts the React/Vite front end that renders prompt-to-MCQ comparisons; all source modules live under `src/` with reusable UI logic collocated by feature, while `public/` carries static scaffolding.
- Prompt experiment metadata, scripts, and any Codex utilities belong in `scripts/`; keep large news datasets outside the repo to avoid leaking competition data.
- Production assets are emitted to `/docs` via Vite’s `outDir` so GitHub Pages can serve the app at `https://igaki12.github.io/compare-jsonl-viewer-ReactJS/`.

## Build, Test, and Development Commands
- `npm install` (run inside `compare-mcq3-app/`) installs React 19 + Vite 7 dependencies.
- `npm run dev` launches the Vite dev server at `http://localhost:5173` for rapid UI tweaks of the prompt comparison board.
- `npm run build` performs a production build, rewriting `/docs` with static assets for GitHub Pages; commit the regenerated folder.
- `npm run preview` serves the production bundle locally at `http://localhost:4173/compare-jsonl-viewer-ReactJS/` to spot routing issues before pushing.
- `npm run lint` executes ESLint (config in `eslint.config.js`) to enforce the style rules below.

## Coding Style & Naming Conventions
- Follow modern React with functional components, hooks, and TypeScript-ready patterns (even though files are `.jsx` today); prefer `PascalCase` for components and `camelCase` for helpers/state setters.
- Keep files under 200 lines where practical; break prompt-specific render logic into subcomponents for clarity.
- Run ESLint before committing and respect the config’s recommended rules (2-space indentation, singe quotes allowed via tooling default).

## Testing Guidelines
- No automated testing harness is defined yet; validate changes by (1) loading multiple prompt JSONL samples, (2) confirming answer ordering (choice 1 correct, 2–3 distractors), and (3) checking side-by-side comparison panes for scroll/overflow regressions.
- Document manual test notes in PR descriptions until Jest/Vitest coverage is introduced.

## Commit & Pull Request Guidelines
- Use imperative subject lines (`Add prompt grid filters`, `Fix Gemma output parser`) and group related file changes; avoid bundling dataset updates with UI tweaks.
- Every PR should explain the prompt experiment impacted, reference the relevant `/scripts` job (if modified), and attach before/after screenshots or GIFs of the comparison view.
- Link competition tasks or issues when applicable, and note whether `npm run build` was executed so reviewers know `/docs` is current.

## Experiment Context
- The UI exists to benchmark ~10 prompt variants against news-derived MCQ outputs generated via the local Ollama Gemma3-12B model; avoid altering the app’s evaluation logic unless requirements from the competition change.
- When adding new prompt presets, describe them in the README and keep the “1st option = correct” invariant so downstream comprehension metrics remain reliable.
