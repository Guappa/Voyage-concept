import { defaultProject, blankProject, defaultSystems, defaultUI } from "./templates.js";
import { defaultSiteMeta, larionSiteMeta } from "./site.js";

const STORAGE_KEY = "voyage-creator-concept:v4";
const SITE_KEY = "voyage-creator-concept:site:v2";

// rules are structured no-code by default; ensure when/effects exist and carry an optional advanced script.
function normalizeHandler(handler) {
  if (handler.source && !handler.script) handler.script = handler.source;
  delete handler.source;
  if (handler.mode !== "script") handler.mode = "rules";
  if (!handler.when || !Array.isArray(handler.when.clauses)) handler.when = { mode: "all", clauses: [] };
  if (!Array.isArray(handler.effects)) handler.effects = [];
  return handler;
}

// every UI widget gets a structured visibility condition so the conditional layer always has something to bind.
function normalizeWidget(widget) {
  if (!widget.visibleWhen || !Array.isArray(widget.visibleWhen.clauses)) widget.visibleWhen = { mode: "all", clauses: [] };
  delete widget.showWhen;
  return widget;
}

// systems and ui are concept-only engine layers; any loaded world (an import) gets them so Game Systems and the UI Builder keep working.
function normalize(project) {
  if (!Array.isArray(project.systems)) project.systems = defaultSystems();
  if (!project.ui) project.ui = defaultUI();
  if (!project.meta) project.meta = { name: "Untitled world" };
  for (const system of project.systems) {
    if (!Array.isArray(system.components)) system.components = [];
    if (!Array.isArray(system.handlers)) system.handlers = [];
    system.handlers.forEach(normalizeHandler);
  }
  for (const formFactor of ["desktop", "mobile"]) {
    const layout = project.ui[formFactor];
    if (!layout) continue;
    for (const screen of Object.values(layout)) {
      if (screen && typeof screen === "object") {
        for (const zone of Object.values(screen)) {
          if (Array.isArray(zone)) zone.forEach(normalizeWidget);
        }
      }
    }
  }
  return project;
}

let hadSaved = false;

function loadProject() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      hadSaved = true;
      return normalize(JSON.parse(raw));
    }
  } catch {
    // corrupt or unavailable storage falls back to the sample world
  }
  return normalize(defaultProject());
}

function loadSite() {
  try {
    const raw = localStorage.getItem(SITE_KEY);
    if (raw) return { ...defaultSiteMeta(), ...JSON.parse(raw) };
  } catch {
    // corrupt or unavailable storage falls back to default meta
  }
  return defaultSiteMeta();
}

export const store = $state({ project: loadProject() });

// Overview metadata lives on the platform account, not inside the world file, so it persists on its own key.
export const siteMeta = $state(loadSite());

export const view = $state({ section: "home", systemId: "survival", formFactor: "desktop" });

export const ui = $state({ search: "" });

// Hamlet is an illustration of the studio agent; the thread is in-memory only.
export const chat = $state({ open: false, messages: [] });

export const saveState = $state({ savedAt: 0 });

// Larion's listing lives outside the world JSON, so it is paired with the world here rather than read from the file.
function applySiteMeta(meta) {
  Object.assign(siteMeta, meta);
  persistSite();
}

// Force-loads the official example world plus its listing; backs both the first-visit preload and the Import Larion button.
export async function loadLarion() {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}larion.json`);
    if (!res.ok) return false;
    const data = await res.json();
    store.project = normalize({ ...data, meta: data.meta ?? { name: "Larion" } });
    applySiteMeta(larionSiteMeta());
    persist();
    return true;
  } catch {
    return false;
  }
}

// Preload Larion only when the visitor has no saved project of their own.
let worldInitDone = false;
export async function initWorld() {
  if (hadSaved || worldInitDone) return;
  worldInitDone = true;
  await loadLarion();
}

let persistTimer;
// debounced so editing a large world doesn't write megabytes to localStorage on every keystroke
export function persist(serialized) {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, serialized ?? JSON.stringify(store.project));
      saveState.savedAt = Date.now();
    } catch {
      // ignore quota / private-mode failures; the prototype keeps working in-memory
    }
  }, 500);
}

export function persistSite() {
  try {
    localStorage.setItem(SITE_KEY, JSON.stringify(siteMeta));
  } catch {
    // ignore quota / private-mode failures
  }
}

export function resetProject() {
  store.project = normalize(blankProject());
  applySiteMeta(defaultSiteMeta());
  persist();
}

export function exportProject() {
  return JSON.stringify(store.project, null, 2);
}

export function importProject(text) {
  store.project = normalize(JSON.parse(text));
  persist();
}

let counter = 0;
export function uid(prefix = "id") {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter.toString(36)}`;
}
