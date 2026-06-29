# Voyage Creator (concept)

A working prototype of a **Systems & UI Builder** for Voyage worlds. The idea: an author defines world systems as explicit, deterministic rules (events, triggers, conditions, effects, statuses) and composes the player-facing UI from those systems, while the AI acts only as a bounded sensor that raises flags the rules react to, never as the source of truth.

This is an exploration repo, not a released product. Expect rough edges.

## Stack

- **Svelte 5** + **Vite 6**
- **CodeMirror 6** for the in-app code/handler editor

## Layout

```
src/
  panels/      top-level views (Overview, Events, BuildSystem, UIBuilder, ModLibrary, …)
  components/  reusable controls (editors, field inputs, sidebar, chat, …)
  lib/
    engine/    the deterministic rules engine (events, triggers, conditions, effects, statuses, operand)
    *.js       schema, store, sections, templates, helpers
    v33-schema.json   the V33 world schema the builder reads
public/
  larion.json  sample world used to populate the builder on load
```

## Develop

Node 20+ (see `.nvmrc`).

```
npm install
npm run dev          # local dev server
npm run build        # production build to dist/
npm run preview      # serve the built dist/
npm run check        # svelte-check: template, prop, binding, and a11y diagnostics
npm run format       # format the tree with Prettier
npm run format:check # verify formatting without writing
```

## Deploy

```
npm run build
wrangler pages deploy dist --project-name voyage-concept
```

The built `dist/` is published to Cloudflare Pages (project `voyage-concept`), live at https://concept.unofficial.voyage/.
