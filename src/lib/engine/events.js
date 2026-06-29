// Deterministic engine hooks the turn loop raises; Voyage owns this set and authors can't invent new ones.
export const EVENT_CATALOG = [
  { id: "onTurnStart", label: "On turn start", note: "Every turn, before narration. Drains, regen, upkeep." },
  { id: "onTurnEnd", label: "On turn end", note: "After the turn resolves. Cleanup, decay, scheduled effects." },
  { id: "onUseAbility", label: "On use ability", note: "When a character invokes an ability. The mechanical half of an ability lives here.", subject: { kind: "ability", label: "ability" } },
  { id: "onSkillCheck", label: "On skill check", note: "When a roll is about to resolve. Add or remove modifiers.", subject: { kind: "skill", label: "skill" } },
  { id: "onDamageTaken", label: "On damage taken", note: "When a character loses health. Wounds, armor, retaliation." },
  { id: "onDealDamage", label: "On deal damage", note: "When a character lands a hit. Lifesteal, recoil, on-hit effects." },
  { id: "onCombatStart", label: "On combat start", note: "When a fight begins. Buffs, stance, threat." },
  { id: "onCombatEnd", label: "On combat end", note: "When a fight ends. Loot, cooldowns, recovery." },
  { id: "onEnterLocation", label: "On enter location", note: "When the party arrives somewhere new.", subject: { kind: "location", label: "location" } },
  { id: "onQuestAccept", label: "On quest accept", note: "When the player takes on a quest.", subject: { kind: "quest", label: "quest" } },
  { id: "onQuestComplete", label: "On quest complete", note: "When a quest's objective is met.", subject: { kind: "quest", label: "quest" } },
  { id: "onMeetEntity", label: "On meet entity", note: "When an NPC, place, or item is first revealed to the player.", subject: { kind: "entity", label: "entity" } },
  { id: "onAcquireItem", label: "On acquire item", note: "When an item enters the inventory.", subject: { kind: "item", label: "item" } },
  { id: "onUseItem", label: "On use item", note: "When an item is consumed or activated.", subject: { kind: "item", label: "item" } },
  { id: "onEquip", label: "On equip", note: "When an item is equipped.", subject: { kind: "item", label: "item" } },
  { id: "onUnequip", label: "On unequip", note: "When an item is removed.", subject: { kind: "item", label: "item" } },
  { id: "onCraftItem", label: "On craft item", note: "When a recipe is completed at a station.", subject: { kind: "item", label: "item" } },
  { id: "onRest", label: "On rest", note: "When the party takes a short or long rest." },
  { id: "onLevelUp", label: "On level up", note: "When a character gains a level." },
  { id: "onNpcRelationshipChanged", label: "On relationship changed", note: "When standing with an NPC or faction shifts." },
];

export function eventSubject(eventId) {
  return EVENT_CATALOG.find((e) => e.id === eventId)?.subject ?? null;
}

export const COMPONENT_TYPES = [
  { id: "int", label: "int", note: "Whole number, e.g. hunger 0–100" },
  { id: "float", label: "float", note: "Decimal, e.g. fuel 0–60.0" },
  { id: "bool", label: "bool", note: "On/off flag" },
  { id: "map", label: "map", note: "Keyed scores, e.g. faction → standing" },
  { id: "list", label: "list", note: "Ordered entries, e.g. wounds" },
  { id: "derived", label: "derived", note: "Computed from other components by a rule" },
];

// The only value types the narrator may set, kept tiny on purpose so its job stays a reliable classification.
export const SENSE_TYPES = [
  { id: "bool", label: "yes / no", note: "Most reliable. The narrator answers a single true/false each turn." },
  { id: "enum", label: "one of a few", note: "A named state from a short list, e.g. idle / walking / sprinting." },
];

// The advanced escape hatch: when no-code rows aren't enough, a rule drops to a sandboxed script.
export const SANDBOX_LIMITS = {
  intro:
    "Advanced rules are an extension of today's trigger scripts: the same guarantees, a richer typed API. A script never reaches the network or filesystem and cannot crash the game — a misbehaving script is skipped and the turn still resolves.",
  rules: [
    "Deterministic: same inputs always produce the same result. No wall-clock, no true randomness (use the seeded ctx.rng).",
    "Isolated: no Node built-ins (require, process, setTimeout), no Function constructor, no network or filesystem.",
    "Time budget: 500 ms shared across every system in a phase. Overrun is killed mid-run and its changes discarded.",
    "Memory budget: 16 MB per isolate, plus headroom scaled to world size.",
    "Typed I/O: a script reads and writes only its system's components and a read-only snapshot of game state.",
    "Errors are logged and skipped — the turn still resolves, partial changes from the failed script are rolled back.",
  ],
};

// The read/write surface a script is given, shown beside the editor as its contract.
export const SCRIPT_API = [
  { sig: "ctx.<component>", note: "Read or write any mechanical component this system declares (typed)." },
  { sig: "ctx.<sense>", note: "Read an AI sense's value for this turn (read-only)." },
  { sig: 'ctx.emit("event")', note: "Raise a custom event other systems can listen for." },
  { sig: "ctx.check(n)", note: "Add n to the pending skill check (onSkillCheck only)." },
  { sig: 'ctx.narrate("…")', note: "Hand the narrator a line to weave into the prose." },
  { sig: "ctx.state", note: "Read-only snapshot: location, party, resources, traits, items, known entities." },
  { sig: "ctx.rng()", note: "Seeded deterministic random in [0,1)." },
  { sig: "ctx.log(msg)", note: "Write to the creator log for debugging." },
];
