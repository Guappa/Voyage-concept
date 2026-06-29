// The one structured, engine-evaluated condition language shared by system rules and conditional UI.
import { resolveOperand, operandLabel } from "./operand.js";

// Reference kinds an author can test; only `flag` is supplied by the narrator, the rest are engine-visible state.
export const REF_KINDS = [
  { kind: "component", label: "Component / resource", hint: "A value your systems track — fuel, hunger, health." },
  { kind: "flag", label: "AI sense", hint: "A situation the narrator judges each turn. The only thing the AI decides." },
  { kind: "skill", label: "Skill", hint: "How trained the character is." },
  { kind: "trait", label: "Trait", hint: "A trait the character has taken." },
  { kind: "item", label: "Item carried", hint: "An item in the inventory." },
  { kind: "equipped", label: "Item equipped", hint: "An item the character has equipped." },
  { kind: "class", label: "Class / archetype", hint: "The character's class or archetype." },
  { kind: "location", label: "Location", hint: "Where the scene is taking place." },
  { kind: "quest", label: "Quest", hint: "Whether a quest is started, active, or done." },
  { kind: "entity", label: "Entity met", hint: "Whether an NPC, place, or item has been revealed to the player." },
];

const NUM_OPS = ["<=", ">=", "==", "!=", "<", ">", "rose", "fell", "changed"];
const FLAG_OPS = ["is true", "is false", "==", "rose", "fell"];
const SKILL_OPS = [">=", "<=", "==", "<", ">", "known", "unknown"];
const MEMBER_OPS = ["has", "lacks"];
const EQUIP_OPS = ["equipped", "not equipped"];
const MATCH_OPS = ["is", "is not"];
const QUEST_OPS = ["is active", "is completed", "not started"];
const ENTITY_OPS = ["met", "not met"];

const OPS_BY_KIND = {
  component: NUM_OPS,
  resource: NUM_OPS,
  flag: FLAG_OPS,
  skill: SKILL_OPS,
  trait: MEMBER_OPS,
  item: MEMBER_OPS,
  equipped: EQUIP_OPS,
  class: MATCH_OPS,
  location: MATCH_OPS,
  quest: QUEST_OPS,
  entity: ENTITY_OPS,
};

// Ops whose subject is fully named by the clause itself, so no second operand is needed.
const VALUELESS = new Set([
  "rose",
  "fell",
  "changed",
  "is true",
  "is false",
  "known",
  "unknown",
  "has",
  "lacks",
  "equipped",
  "not equipped",
  "is active",
  "is completed",
  "not started",
  "met",
  "not met",
]);

// class / location have a single subject, so the tested name lives in `value`, not `ref.name`.
const SUBJECT_IN_VALUE = new Set(["class", "location"]);

export function opsFor(kind) {
  return OPS_BY_KIND[kind] ?? NUM_OPS;
}

export function needsValue(op) {
  return !VALUELESS.has(op);
}

export function subjectInValue(kind) {
  return SUBJECT_IN_VALUE.has(kind);
}

export function emptyClause(kind = "component") {
  return { ref: { kind, name: "" }, op: opsFor(kind)[0], value: "" };
}

export function emptyCondition() {
  return { mode: "all", clauses: [] };
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function numCompare(current, op, value, before) {
  if (typeof current === "boolean") {
    const want = value === true || value === "true";
    if (op === "==") return current === want;
    if (op === "!=") return current !== want;
    if (op === "rose") return before != null && current && !before;
    if (op === "fell") return before != null && !current && Boolean(before);
    if (op === "changed") return before != null && current !== before;
    return current;
  }
  switch (op) {
    case "<=":
      return current <= toNumber(value);
    case ">=":
      return current >= toNumber(value);
    case "==":
      return current === toNumber(value);
    case "!=":
      return current !== toNumber(value);
    case "<":
      return current < toNumber(value);
    case ">":
      return current > toNumber(value);
    case "rose":
      return before != null && current > before;
    case "fell":
      return before != null && current < before;
    case "changed":
      return before != null && current !== before;
    default:
      return false;
  }
}

function inSet(collection, name) {
  if (!collection) return false;
  if (collection instanceof Set) return collection.has(name);
  if (Array.isArray(collection)) return collection.includes(name);
  return Boolean(collection[name]);
}

// Lets the value side of a clause reference another live stat or skill, so authors can compare stats without a script.
function readRef(ctx, kind, name) {
  if (kind === "skill") return ctx.skills?.[name] ?? 0;
  return ctx.values?.[name] ?? 0;
}

// prev carries last turn's values/flags so directional operators (rose/fell) have a baseline.
export function evalClause(clause, ctx, prev) {
  const { ref, op, value } = clause;
  const rhs = () => resolveOperand(value, (kind, name) => readRef(ctx, kind, name), Object.keys(ctx.values ?? {}));
  switch (ref.kind) {
    case "component":
    case "resource":
      return numCompare(ctx.values?.[ref.name] ?? 0, op, rhs(), prev?.values?.[ref.name]);
    case "skill": {
      const level = ctx.skills?.[ref.name];
      if (op === "known") return level != null;
      if (op === "unknown") return level == null;
      return numCompare(level ?? 0, op, rhs());
    }
    case "trait":
      return inSet(ctx.traits, ref.name) === (op === "has");
    case "item":
      return inSet(ctx.items, ref.name) === (op === "has");
    case "equipped":
      return inSet(ctx.equipped, ref.name) === (op === "equipped");
    case "class":
      return (ctx.class === value) === (op === "is");
    case "location":
      return (ctx.location === value) === (op === "is");
    case "quest": {
      const status = ctx.quests?.[ref.name] ?? "notStarted";
      if (op === "is active") return status === "active";
      if (op === "is completed") return status === "completed";
      if (op === "not started") return status === "notStarted";
      return false;
    }
    case "entity":
      return inSet(ctx.revealed, ref.name) === (op === "met");
    case "flag": {
      const current = ctx.flags?.[ref.name];
      const before = prev?.flags?.[ref.name];
      if (op === "is true") return Boolean(current);
      if (op === "is false") return !current;
      if (op === "rose") return before != null && Boolean(current) && !before;
      if (op === "fell") return before != null && !current && Boolean(before);
      if (op === "==") return String(current) === String(value);
      return false;
    }
    default:
      return false;
  }
}

export function evalCondition(condition, ctx, prev) {
  const clauses = condition?.clauses ?? [];
  if (!clauses.length) return true;
  const test = (clause) => evalClause(clause, ctx, prev);
  return condition.mode === "any" ? clauses.some(test) : clauses.every(test);
}

// Mirrors Voyage's own trigger operator names (equals, greaterThanOrEqual…) rendered as plain words, so trigger-literate authors read rules with no relearning.
const OP_LABELS = {
  "<=": "less than or equal",
  ">=": "greater than or equal",
  "==": "equals",
  "!=": "not equals",
  "<": "less than",
  ">": "greater than",
  rose: "increased",
  fell: "decreased",
  changed: "changed",
  "is true": "is true",
  "is false": "is false",
  known: "is known",
  unknown: "is not known",
  has: "has",
  lacks: "lacks",
  equipped: "equipped",
  "not equipped": "not equipped",
  is: "is",
  "is not": "is not",
};

// An AI sense is a yes/no, so its rose/fell read as a state flip rather than a numeric move.
const FLAG_OP_LABELS = { rose: "became true", fell: "became false" };

export function opLabel(op, kind) {
  if (kind === "flag" && FLAG_OP_LABELS[op]) return FLAG_OP_LABELS[op];
  return OP_LABELS[op] ?? op;
}

function describeClause(clause) {
  const { ref, op, value } = clause;
  if (subjectInValue(ref.kind)) return `${ref.kind} ${opLabel(op, ref.kind)} ${value || "…"}`;
  if (ref.kind === "trait" || ref.kind === "item") return `${opLabel(op, ref.kind)} ${ref.name || "…"}`;
  if (ref.kind === "equipped") return `${ref.name || "…"} ${opLabel(op, ref.kind)}`;
  if (ref.kind === "flag") return op === "==" ? `${ref.name || "…"} equals ${value || "…"}` : `${ref.name || "…"} ${opLabel(op, ref.kind)}`;
  if (VALUELESS.has(op)) return `${ref.name || "…"} ${opLabel(op, ref.kind)}`;
  return `${ref.name || "…"} ${opLabel(op, ref.kind)} ${operandLabel(value)}`;
}

export function describeCondition(condition) {
  const clauses = condition?.clauses ?? [];
  if (!clauses.length) return "always";
  return clauses.map(describeClause).join(condition.mode === "any" ? " or " : " and ");
}

// Resolves the pickable names per ref kind from the live world so the builder only offers what exists.
export function vocabulary(project) {
  const components = [];
  const flags = [];
  for (const system of project.systems ?? []) {
    for (const component of system.components ?? []) {
      if (component.sensed) flags.push(component);
      else components.push(component.name);
    }
  }
  return {
    component: [...new Set([...components, ...Object.keys(project.resourceSettings ?? {})])],
    flag: flags.map((component) => component.name),
    flagMeta: flags,
    skill: Object.keys(project.skills ?? {}),
    trait: Object.keys(project.traits ?? {}),
    item: Object.keys(project.items ?? {}),
    equipped: Object.keys(project.items ?? {}),
    class: Object.keys(project.characterArchetypes ?? {}),
    location: Object.keys(project.locations ?? {}),
    ability: Object.keys(project.abilities ?? {}),
    quest: Object.keys(project.quests ?? {}),
    entity: [...new Set([...Object.keys(project.npcs ?? {}), ...Object.keys(project.locations ?? {}), ...Object.keys(project.items ?? {})])],
  };
}
