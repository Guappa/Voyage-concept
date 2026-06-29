// Timed statuses: the no-code abstraction over the manual trigger pattern (a tick counter plus a reset).
import { resolveOperand } from "./operand.js";

const KEY = "__statuses";
const SEQ = "__statusSeq";

export function activeStatuses(state) {
  return Array.isArray(state?.[KEY]) ? state[KEY] : [];
}

// The amount is fixed when the status is applied (a cast snapshot), so "10% of current HP" locks in at that moment.
export function applyStatus(state, effect, read, names) {
  const amount = Number(resolveOperand(effect.value, read, names)) || 0;
  const turns = Number(effect.turns) || 0;
  const seq = (state[SEQ] ?? 0) + 1;
  const entry = {
    id: `st${seq}`,
    label: effect.label || "Status",
    group: effect.group || "",
    target: effect.target || "",
    scope: effect.scope || "self",
    amount,
    remaining: turns > 0 ? turns : null,
  };
  const next = { ...state, [SEQ]: seq, [KEY]: [...activeStatuses(state), entry] };
  if (entry.target) next[entry.target] = (next[entry.target] ?? 0) + amount;
  return next;
}

// Reverses and removes every status in a group (or all), so "removes other shield effects" is one effect.
export function clearStatuses(state, group) {
  const keep = [];
  const next = { ...state };
  for (const status of activeStatuses(state)) {
    if (group && group !== "all" && status.group !== group) {
      keep.push(status);
      continue;
    }
    if (status.target) next[status.target] = (next[status.target] ?? 0) - status.amount;
  }
  next[KEY] = keep;
  return next;
}

// One turn-tick of decay; finite statuses count down and drop their contribution when they reach zero.
export function tickStatuses(state) {
  const keep = [];
  const next = { ...state };
  for (const status of activeStatuses(state)) {
    if (status.remaining == null) {
      keep.push(status);
      continue;
    }
    const remaining = status.remaining - 1;
    if (remaining > 0) keep.push({ ...status, remaining });
    else if (status.target) next[status.target] = (next[status.target] ?? 0) - status.amount;
  }
  next[KEY] = keep;
  return next;
}
