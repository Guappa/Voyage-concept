// Built for auditing agent-written triggers, not editing them: 9/10 are AI-authored, so the value is making them readable and lintable.

const OP_WORD = {
  equals: "is",
  notEquals: "is not",
  contains: "has",
  notContains: "lacks",
  lessThan: "below",
  lessThanOrEqual: "at most",
  greaterThan: "above",
  greaterThanOrEqual: "at least",
  regex: "matches",
  set: "set to",
  add: "add",
  remove: "remove",
  subtract: "subtract",
};

function opWord(op) {
  return OP_WORD[op] ?? op ?? "";
}

function truncate(text, max = 140) {
  const clean = String(text ?? "")
    .replace(/\s+/g, " ")
    .trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

const ENTITY_KIND = {
  "party-location": "location",
  "party-region": "region",
  "party-realm": "realm",
  "party-area": "area",
  "player-traits": "trait",
};

function clauseVar(clause) {
  if (clause.type?.startsWith("read-") || clause.type?.startsWith("write-")) return clause.key;
  return null;
}

export function describeCondition(condition) {
  const { type, operator, value, query, key, item } = condition;
  switch (type) {
    case "story":
      return `narrator senses: “${truncate(query, 110)}”`;
    case "action":
      return `player action: “${truncate(query, 110)}”`;
    case "has-item":
      return operator === "notContains" ? `lacks item “${item}”` : `has item “${item}”`;
    case "story-text":
      return `story text ${opWord(operator)} /${value}/`;
    case "action-text":
      return `action text ${opWord(operator)} /${value}/`;
    case "player-traits":
      if (operator === "contains") return `has trait “${value}”`;
      if (operator === "notContains") return `lacks trait “${value}”`;
      return `trait ${opWord(operator)} “${value}”`;
    case "read-boolean":
      return `${key} is ${value === true || value === "true" ? "true" : "false"}`;
    case "read-string":
      return `${key} ${opWord(operator)} “${value}”`;
    case "read-number":
      return `${key} ${opWord(operator)} ${value}`;
    case "game-tick":
      return `turn count ${opWord(operator)} ${value}`;
    case "player-level":
      return `level ${opWord(operator)} ${value}`;
    case "party-location":
      return `party at “${value}”`;
    case "party-area":
      return `party in area “${value}”`;
    case "party-region":
      return `party in region “${value}”`;
    case "party-realm":
      return `party in realm “${value}”`;
    default:
      return `${type} ${opWord(operator)} ${value ?? query ?? ""}`.trim();
  }
}

function targetPhrase(effect) {
  return effect.target && effect.target !== "party" ? ` (${targetLabel(effect.target)})` : "";
}

export function describeEffect(effect) {
  const { type, operator, value, instruction, key, resource, item } = effect;
  switch (type) {
    case "story":
      return `tell the narrator: “${truncate(instruction, 120)}”`;
    case "give-item":
      if (operator === "remove") return `take ${value}× “${item}”${targetPhrase(effect)}`;
      if (operator === "set") return `set “${item}” count to ${value}${targetPhrase(effect)}`;
      return `give ${value}× “${item}”${targetPhrase(effect)}`;
    case "player-traits":
      if (operator === "add") return `grant trait “${value}”${targetPhrase(effect)}`;
      if (operator === "remove") return `remove trait “${value}”${targetPhrase(effect)}`;
      return `set traits to “${value}”${targetPhrase(effect)}`;
    case "player-resource":
      return `${opWord(operator)} ${value} ${operator === "set" ? "to" : "on"} ${resource}${targetPhrase(effect)}`;
    case "write-boolean":
      return `set ${key} = ${value}`;
    case "write-string":
      return `set ${key} = “${value}”`;
    case "write-number":
      return `${opWord(operator)} ${value} ${operator === "set" ? "to" : "on"} ${key}`;
    case "party-location":
      return `move party to “${value}”`;
    case "party-area":
      return `move party to area “${value}”`;
    case "party-region":
      return `move party to region “${value}”`;
    case "party-realm":
      return `move party to realm “${value}”`;
    default:
      return `${type} ${opWord(operator)} ${value ?? ""}`.trim();
  }
}

function referencesOf(trigger) {
  const refs = [];
  const add = (kind, name) => {
    if (kind && name != null && name !== "") refs.push({ kind, name });
  };
  for (const c of trigger.conditions ?? []) {
    add(ENTITY_KIND[c.type], c.value);
    if (c.item) add("item", c.item);
    const v = clauseVar(c);
    if (v) add("var", v);
  }
  for (const e of trigger.effects ?? []) {
    add(ENTITY_KIND[e.type], e.value);
    if (e.item) add("item", e.item);
    const v = clauseVar(e);
    if (v) add("var", v);
  }
  const seen = new Set();
  return refs.filter((r) => {
    const k = `${r.kind}:${r.name}`;
    return seen.has(k) ? false : seen.add(k);
  });
}

function refKey(ref) {
  return `${ref.kind}:${ref.name}`;
}

export function normalizeTriggers(project) {
  const raw = project?.triggers ?? {};
  return Object.entries(raw).map(([name, trigger]) => {
    const conditions = trigger.conditions ?? [];
    const effects = trigger.effects ?? [];
    return {
      id: name,
      name: trigger.name ?? name,
      recurring: !!trigger.recurring,
      hasScript: !!trigger.script,
      script: trigger.script ?? "",
      conditions,
      effects,
      raw: trigger,
      whenLines: conditions.map(describeCondition),
      thenLines: effects.map(describeEffect),
      condTypes: [...new Set(conditions.map((c) => c.type))],
      effectTypes: [...new Set(effects.map((e) => e.type))],
      refs: referencesOf({ conditions, effects }),
    };
  });
}

// Keys a script touches via storage.x, storage["x"], or a check()/effects.push key, so script-managed state isn't mistaken for orphaned.
function scriptKeys(script) {
  const keys = new Set();
  if (!script) return keys;
  const text = String(script);
  for (const m of text.matchAll(/storage\.([A-Za-z_$][\w$]*)/g)) keys.add(m[1]);
  for (const m of text.matchAll(/storage\[\s*['"]([^'"]+)['"]\s*\]/g)) keys.add(m[1]);
  for (const m of text.matchAll(/key\s*:\s*['"]([^'"]+)['"]/g)) keys.add(m[1]);
  return keys;
}

function varFlows(triggers) {
  const read = new Set();
  const written = new Set();
  for (const t of triggers) {
    for (const c of t.conditions) {
      const v = clauseVar(c);
      if (c.type?.startsWith("read-") && v) read.add(v);
    }
    for (const e of t.effects) {
      const v = clauseVar(e);
      if (e.type?.startsWith("write-") && v) written.add(v);
    }
    // a script can read or write any key opaquely, so count its keys both ways rather than flag them as orphaned
    for (const k of scriptKeys(t.script)) {
      read.add(k);
      written.add(k);
    }
  }
  return { read, written };
}

const KIND_SECTION = { location: "locations", region: "regions", realm: "realms", trait: "traits", item: "items" };

function lintTrigger(trigger, project, flows) {
  const out = [];
  for (const ref of trigger.refs) {
    const section = KIND_SECTION[ref.kind];
    if (section && project?.[section] && !project[section][ref.name]) {
      out.push({ level: "warn", text: `references ${ref.kind} “${ref.name}”, which the world doesn't define` });
    }
    if (ref.kind === "var") {
      const readsIt = trigger.conditions.some((c) => c.type?.startsWith("read-") && c.key === ref.name);
      const writesIt = trigger.effects.some((e) => e.type?.startsWith("write-") && e.key === ref.name);
      if (readsIt && !flows.written.has(ref.name)) out.push({ level: "warn", text: `reads “${ref.name}”, but no trigger ever writes it` });
      if (writesIt && !flows.read.has(ref.name)) out.push({ level: "info", text: `writes “${ref.name}”, but no trigger reads it back` });
    }
  }
  if (trigger.hasScript) out.push({ level: "info", text: "runs a script — its logic is opaque here, open the code to audit it" });
  if (!trigger.conditions.length) out.push({ level: "info", text: "has no conditions, so it fires unconditionally" });
  const semanticOnly = trigger.conditions.length > 0 && trigger.conditions.every((c) => c.type === "story" || c.type === "action");
  if (semanticOnly) out.push({ level: "info", text: "gated only on a narrator judgment, with no structural condition" });
  return out;
}

export function indexTriggers(project) {
  const triggers = normalizeTriggers(project);
  const flows = varFlows(triggers);
  for (const t of triggers) t.lint = lintTrigger(t, project, flows);

  const byEntity = new Map();
  const condTypes = new Map();
  const effectTypes = new Map();
  const bump = (map, key) => map.set(key, (map.get(key) ?? 0) + 1);

  for (const t of triggers) {
    for (const ref of t.refs) {
      const key = refKey(ref);
      if (!byEntity.has(key)) byEntity.set(key, { ref, triggerIds: [] });
      byEntity.get(key).triggerIds.push(t.id);
    }
    for (const type of t.condTypes) bump(condTypes, type);
    for (const type of t.effectTypes) bump(effectTypes, type);
  }

  const entities = [...byEntity.values()].sort((a, b) => b.triggerIds.length - a.triggerIds.length);

  return {
    triggers,
    byId: new Map(triggers.map((t) => [t.id, t])),
    byEntity,
    entities,
    condTypes: [...condTypes.entries()].sort((a, b) => b[1] - a[1]),
    effectTypes: [...effectTypes.entries()].sort((a, b) => b[1] - a[1]),
    stats: {
      total: triggers.length,
      recurring: triggers.filter((t) => t.recurring).length,
      scripted: triggers.filter((t) => t.hasScript).length,
      flagged: triggers.filter((t) => t.lint.some((l) => l.level === "warn")).length,
    },
  };
}

const KIND_LABEL = { location: "Location", region: "Region", realm: "Realm", area: "Area", trait: "Trait", item: "Item", var: "State" };
export function kindLabel(kind) {
  return KIND_LABEL[kind] ?? kind;
}

const TYPE_LABEL = {
  "player-traits": "trait",
  story: "narrator sense",
  action: "player action",
  "read-boolean": "read flag",
  "read-string": "read text",
  "read-number": "read number",
  "write-boolean": "write flag",
  "write-string": "write text",
  "write-number": "write number",
  "game-tick": "turn count",
  "party-area": "area",
  "party-location": "location",
  "party-region": "region",
  "party-realm": "realm",
  "story-text": "story text",
  "action-text": "action text",
  "player-level": "level",
  "has-item": "has item",
  "give-item": "give item",
};
export function typeLabel(type) {
  return TYPE_LABEL[type] ?? type;
}

function namePrefix(name, depth) {
  return name.split("_").slice(0, depth).join("_");
}

function groupByPrefix(triggers, depth) {
  const groups = new Map();
  for (const t of triggers) {
    const prefix = namePrefix(t.name, depth);
    if (!groups.has(prefix)) groups.set(prefix, []);
    groups.get(prefix).push(t);
  }
  return groups;
}

const INDIVIDUAL_MAX = 14;
const CLUSTER_CAP = 12;

// Clustering goes the deepest needed to split a shared-prefix hub into a useful spread, not the shallowest that collapses it to one blob.
function clusterSpokes(triggers) {
  if (triggers.length <= INDIVIDUAL_MAX) {
    return triggers.map((t) => ({ label: t.name, count: 1, single: t, prefix: namePrefix(t.name, 1), ids: [t.id] }));
  }
  let chosen = groupByPrefix(triggers, 1);
  for (let depth = 1; depth <= 8; depth += 1) {
    chosen = groupByPrefix(triggers, depth);
    if (chosen.size >= CLUSTER_CAP) break;
  }
  let nodes = [...chosen.entries()]
    .map(([prefix, ts]) =>
      ts.length === 1 ? { label: ts[0].name, count: 1, single: ts[0], prefix, ids: [ts[0].id] } : { label: `${prefix}_*`, count: ts.length, single: null, prefix, ids: ts.map((t) => t.id) },
    )
    .sort((a, b) => b.count - a.count);
  if (nodes.length > CLUSTER_CAP) {
    const head = nodes.slice(0, CLUSTER_CAP - 1);
    const rest = nodes.slice(CLUSTER_CAP - 1);
    head.push({ label: `+${rest.length} more`, count: rest.reduce((n, g) => n + g.count, 0), single: null, prefix: "", ids: rest.flatMap((g) => g.ids), overflow: true });
    nodes = head;
  }
  return nodes;
}

// A subgraph scoped to one entity, so it stays a handful of readable nodes instead of the whole-world hairball.
export function neighborhood(index, entityKey) {
  const hub = index.byEntity.get(entityKey);
  if (!hub) return null;
  const triggers = hub.triggerIds.map((id) => index.byId.get(id));
  const others = new Map();
  for (const t of triggers) {
    for (const ref of t.refs) {
      const key = refKey(ref);
      if (key === entityKey) continue;
      if (!others.has(key)) others.set(key, { ref, count: 0 });
      others.get(key).count += 1;
    }
  }
  return {
    hub: hub.ref,
    total: triggers.length,
    nodes: clusterSpokes(triggers),
    others: [...others.values()].sort((a, b) => b.count - a.count),
  };
}

export { refKey };

const NUM_OPS = ["equals", "notEquals", "greaterThan", "lessThan", "greaterThanOrEqual", "lessThanOrEqual"];
const TEXT_OPS = ["equals", "notEquals", "contains", "notContains", "regex"];
const MEMBER_OPS = ["contains", "notContains"];
const BOOL_OPS = ["equals", "notEquals"];

// Authoring catalog: every V33 condition type, its extra field, allowed operators, and the value's shape + vocab source.
export const CONDITION_TYPES = [
  { type: "party-location", label: "Party at location", ops: TEXT_OPS, value: "string", vocab: "location" },
  { type: "party-area", label: "Party in area", ops: TEXT_OPS, value: "string" },
  { type: "party-region", label: "Party in region", ops: TEXT_OPS, value: "string", vocab: "region" },
  { type: "party-realm", label: "Party in realm", ops: TEXT_OPS, value: "string", vocab: "realm" },
  { type: "player-traits", label: "Party has trait", ops: MEMBER_OPS, value: "string", vocab: "trait" },
  { type: "player-level", label: "Player level", ops: NUM_OPS, value: "number" },
  { type: "player-resource", label: "Player resource", extra: "resource", ops: NUM_OPS, value: "number", vocab: "resource" },
  { type: "known-entity", label: "Entity is known", extra: "entity", ops: BOOL_OPS, value: "boolean", vocab: "entity" },
  { type: "quests-completed", label: "Quest completed", ops: MEMBER_OPS, value: "string", vocab: "quest" },
  { type: "game-tick", label: "Turn count", ops: NUM_OPS, value: "number" },
  { type: "read-boolean", label: "Read saved flag (true/false)", extra: "key", ops: BOOL_OPS, value: "boolean" },
  { type: "read-string", label: "Read saved text", extra: "key", ops: TEXT_OPS, value: "string" },
  { type: "read-number", label: "Read saved number", extra: "key", ops: NUM_OPS, value: "number" },
  { type: "read-array", label: "Read saved list", extra: "key", ops: MEMBER_OPS, value: "string" },
  { type: "story-text", label: "Story text", ops: TEXT_OPS, value: "string" },
  { type: "action-text", label: "Action text", ops: TEXT_OPS, value: "string" },
  { type: "story", label: "Narrator senses (AI)", extra: "query", ops: [], value: "none" },
  { type: "action", label: "Player action (AI)", extra: "query", ops: [], value: "none" },
  {
    type: "has-item",
    label: "Has item",
    extra: "item",
    ops: MEMBER_OPS,
    value: "none",
    vocab: "item",
    beyond: true,
    note: "Deterministic. V33 has no item condition; today only a narrator-judged story condition can approximate it, and it can miss.",
  },
];

export const EFFECT_TYPES = [
  { type: "story", label: "Tell the narrator", extra: "instruction", ops: [], value: "none" },
  { type: "quest-init", label: "Start quest", ops: ["set"], value: "string", vocab: "quest" },
  { type: "quest-progress", label: "Advance quest", extra: "questId", ops: [], value: "none", vocab: "quest" },
  { type: "party-location", label: "Move party to location", ops: ["set"], value: "string", vocab: "location" },
  { type: "party-area", label: "Move party to area", ops: ["set"], value: "string" },
  { type: "party-region", label: "Move party to region", ops: ["set"], value: "string", vocab: "region" },
  { type: "party-realm", label: "Move party to realm", ops: ["set"], value: "string", vocab: "realm" },
  { type: "player-traits", label: "Party trait", ops: ["add", "remove", "set"], value: "string", vocab: "trait", targetable: true },
  { type: "player-resource", label: "Party resource", extra: "resource", ops: ["add", "subtract", "multiply", "divide", "set"], value: "number", vocab: "resource", targetable: true },
  { type: "known-entity", label: "Reveal entity", extra: "entity", ops: ["set", "toggle"], value: "boolean", vocab: "entity" },
  { type: "write-boolean", label: "Write saved flag", extra: "key", ops: ["set", "toggle"], value: "boolean" },
  { type: "write-string", label: "Write saved text", extra: "key", ops: ["set"], value: "string" },
  { type: "write-number", label: "Write saved number", extra: "key", ops: ["add", "subtract", "multiply", "divide", "set"], value: "number" },
  { type: "write-array", label: "Write saved list", extra: "key", ops: ["set", "add", "remove"], value: "string" },
  {
    type: "give-item",
    label: "Give / take item",
    extra: "item",
    ops: ["add", "remove", "set"],
    value: "number",
    vocab: "item",
    targetable: true,
    beyond: true,
    note: "Deterministic. V33 has no item effect; a story instruction can ask the narrator to hand one over, but the grant isn't guaranteed.",
  },
];

// Players have no authoring-time identity, so the only deterministic targets are ones the trigger's own evaluation already resolved.
export const TARGET_OPTIONS = [
  { id: "party", label: "the whole party", hint: "every character — today's only behaviour" },
  { id: "matched", label: "whoever matched", hint: "the members who satisfy every player condition on this event; none → no-op", beyond: true },
  { id: "actor", label: "the acting player", hint: "planning phase only — needs an action condition", beyond: true },
];
export function targetLabel(id) {
  return TARGET_OPTIONS.find((t) => t.id === id)?.label ?? "the whole party";
}
export function isBeyondTarget(id) {
  return !!TARGET_OPTIONS.find((t) => t.id === id)?.beyond;
}
export function isBeyondType(type) {
  return !!(conditionSpec(type)?.beyond || effectSpec(type)?.beyond);
}
export function beyondNote(type) {
  return conditionSpec(type)?.note ?? effectSpec(type)?.note ?? "";
}

const PLAYER_COND = new Set(["player-traits", "player-level", "player-resource", "has-item"]);
const ACTOR_COND = new Set(["action", "action-text"]);

// A target is only offerable when the trigger's conditions make it resolvable at runtime.
export function availableTargets(trigger) {
  const types = (trigger?.conditions ?? []).map((c) => c.type);
  const ids = ["party"];
  if (types.some((t) => PLAYER_COND.has(t))) ids.push("matched");
  if (types.some((t) => ACTOR_COND.has(t))) ids.push("actor");
  return TARGET_OPTIONS.filter((t) => ids.includes(t.id));
}

const OP_LABEL = {
  equals: "is",
  notEquals: "is not",
  contains: "contains",
  notContains: "does not contain",
  regex: "matches regex",
  greaterThan: "greater than",
  lessThan: "less than",
  greaterThanOrEqual: "at least",
  lessThanOrEqual: "at most",
  set: "set to",
  add: "add",
  remove: "remove",
  subtract: "subtract",
  multiply: "multiply",
  divide: "divide",
  toggle: "toggle",
};
export function operatorLabel(op) {
  return OP_LABEL[op] ?? op;
}

export function conditionSpec(type) {
  return CONDITION_TYPES.find((c) => c.type === type);
}
export function effectSpec(type) {
  return EFFECT_TYPES.find((e) => e.type === type);
}

function seed(spec) {
  const row = { type: spec.type };
  if (spec.extra) row[spec.extra] = "";
  if (spec.ops.length) row.operator = spec.ops[0];
  if (spec.value === "boolean") row.value = true;
  else if (spec.value === "number") row.value = 0;
  else if (spec.value === "string") row.value = "";
  return row;
}
export function emptyConditionRow(type = "party-location") {
  return seed(conditionSpec(type));
}
export function emptyEffectRow(type = "story") {
  return seed(effectSpec(type));
}
export function emptyTrigger(name = "new_event") {
  return { name, recurring: false, conditions: [], effects: [emptyEffectRow("story")] };
}

// Authoring vocab: value dropdowns plus the storage keys already in use, so flags/text can be reused not retyped.
export function triggerVocab(project) {
  const keys = new Set();
  for (const t of Object.values(project?.triggers ?? {})) {
    for (const c of t.conditions ?? []) if (c.key) keys.add(c.key);
    for (const e of t.effects ?? []) if (e.key) keys.add(e.key);
  }
  return {
    location: Object.keys(project?.locations ?? {}),
    region: Object.keys(project?.regions ?? {}),
    realm: Object.keys(project?.realms ?? {}),
    trait: Object.keys(project?.traits ?? {}),
    quest: Object.keys(project?.quests ?? {}),
    resource: Object.keys(project?.resourceSettings ?? {}),
    item: Object.keys(project?.items ?? {}),
    entity: [...new Set([...Object.keys(project?.npcs ?? {}), ...Object.keys(project?.factions ?? {}), ...Object.keys(project?.locations ?? {}), ...Object.keys(project?.items ?? {})])],
    key: [...keys],
  };
}

export function slugifyName(name) {
  return (
    String(name ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "new_event"
  );
}
