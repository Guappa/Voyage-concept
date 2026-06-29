import { isRefOperand, isExprOperand, resolveOperand, operandLabel } from "./operand.js";
import { applyStatus, clearStatuses } from "./statuses.js";

// Structured, deterministic effects a rule applies when its condition holds.
export const EFFECT_KINDS = [
  { kind: "add", label: "add", needs: "target+value" },
  { kind: "sub", label: "subtract", needs: "target+value" },
  { kind: "set", label: "set to", needs: "target+value" },
  { kind: "mul", label: "multiply", needs: "target+value" },
  { kind: "status", label: "apply status (timed)", needs: "status" },
  { kind: "clearStatus", label: "remove statuses", needs: "group" },
  { kind: "quest", label: "quest", needs: "quest" },
  { kind: "trait", label: "trait", needs: "trait" },
  { kind: "reveal", label: "reveal entity", needs: "entity" },
  { kind: "move", label: "move party to", needs: "location" },
  { kind: "block", label: "block the action", needs: "reason" },
  { kind: "emit", label: "emit event", needs: "event" },
  { kind: "check", label: "skill check", needs: "value" },
  { kind: "narrate", label: "tell the narrator", needs: "text" },
];

// Who a status reaches; recorded on the effect and surfaced, gating which entities receive it in a full party.
export const STATUS_SCOPES = [
  { id: "self", label: "self" },
  { id: "allies", label: "allies" },
  { id: "enemies", label: "enemies" },
  { id: "everyone", label: "everyone" },
];

export const QUEST_EFFECT_OPS = [
  { id: "start", label: "start" },
  { id: "complete", label: "complete" },
];

export const TRAIT_EFFECT_OPS = [
  { id: "grant", label: "grant" },
  { id: "remove", label: "remove" },
];

export function emptyEffect(target = "") {
  return { kind: "sub", target, value: 1 };
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function coerce(raw) {
  if (raw === true || raw === false) return raw;
  const text = String(raw).trim();
  if (text === "true") return true;
  if (text === "false") return false;
  const parsed = Number(text);
  return text !== "" && !Number.isNaN(parsed) ? parsed : text;
}

// Applies effects to a copy of state and reports everything the engine would hand the narrator.
export function applyEffects(effects, state) {
  let next = { ...state };
  const emitted = [];
  const narrations = [];
  let checkMod = 0;
  let blocked = false;
  const read = (kind, name) => next[name] ?? 0;
  const names = Object.keys(next);
  for (const effect of effects ?? []) {
    if (effect.kind === "status") {
      next = applyStatus(next, effect, read, names);
      continue;
    }
    if (effect.kind === "clearStatus") {
      next = clearStatuses(next, effect.group);
      continue;
    }
    if (effect.kind === "quest") {
      next.__quests = { ...(next.__quests ?? {}), [effect.quest]: effect.questOp === "complete" ? "completed" : "active" };
      continue;
    }
    if (effect.kind === "trait") {
      const have = new Set(next.__traits ?? []);
      if (effect.traitOp === "remove") have.delete(effect.trait);
      else if (effect.trait) have.add(effect.trait);
      next.__traits = [...have];
      continue;
    }
    if (effect.kind === "reveal") {
      next.__revealed = [...new Set([...(next.__revealed ?? []), effect.entity].filter(Boolean))];
      continue;
    }
    if (effect.kind === "move") {
      next.__location = effect.location;
      continue;
    }
    if (effect.kind === "block") {
      blocked = true;
      if (effect.reason) narrations.push(effect.reason);
      continue;
    }
    const operand = resolveOperand(effect.value, read, names);
    if (effect.kind === "add") next[effect.target] = (next[effect.target] ?? 0) + toNumber(operand);
    else if (effect.kind === "sub") next[effect.target] = (next[effect.target] ?? 0) - toNumber(operand);
    else if (effect.kind === "mul") next[effect.target] = (next[effect.target] ?? 0) * toNumber(operand);
    else if (effect.kind === "set") next[effect.target] = isRefOperand(effect.value) || isExprOperand(effect.value) ? operand : coerce(effect.value);
    else if (effect.kind === "emit") emitted.push(effect.event);
    else if (effect.kind === "check") checkMod += toNumber(operand);
    else if (effect.kind === "narrate" && effect.text) narrations.push(effect.text);
  }
  return { state: next, emitted, checkMod, narrations, blocked };
}

const VERB = { add: "add", sub: "subtract", set: "set to", mul: "multiply" };

export function describeEffect(effect) {
  if (effect.kind === "emit") return `emit "${effect.event || "…"}"`;
  if (effect.kind === "check") return `skill check ${toNumber(effect.value) >= 0 ? "+" : ""}${effect.value}`;
  if (effect.kind === "narrate") return `narrator: ${effect.text || "…"}`;
  if (effect.kind === "clearStatus") return `remove ${effect.group && effect.group !== "all" ? `“${effect.group}” ` : ""}statuses`;
  if (effect.kind === "quest") return `${effect.questOp === "complete" ? "complete" : "start"} quest “${effect.quest || "…"}”`;
  if (effect.kind === "trait") return `${effect.traitOp === "remove" ? "remove" : "grant"} trait “${effect.trait || "…"}”`;
  if (effect.kind === "reveal") return `reveal “${effect.entity || "…"}”`;
  if (effect.kind === "move") return `move party to “${effect.location || "…"}”`;
  if (effect.kind === "block") return `block the action${effect.reason ? ` (${effect.reason})` : ""}`;
  if (effect.kind === "status") {
    const grant = effect.target ? `${effect.target} add ${operandLabel(effect.value)}` : operandLabel(effect.value);
    const dur = Number(effect.turns) > 0 ? ` for ${effect.turns} turns` : "";
    return `apply ${effect.label || "status"} (${grant})${dur}`;
  }
  return `${effect.target || "…"} ${VERB[effect.kind]} ${operandLabel(effect.value)}`;
}
