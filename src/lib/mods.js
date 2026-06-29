// Categories span the whole moddable surface so any mod has a home.
export const MOD_CATEGORIES = [
  { id: "instructions", label: "Instructions", note: "How the narrator writes and runs scenes." },
  { id: "systems", label: "Systems", note: "Mechanics: resources, combat, skills, abilities." },
  { id: "content", label: "Content", note: "Items, characters, factions, and lore." },
  { id: "rules", label: "Rules & Balance", note: "Settings, difficulty, and the numbers." },
  { id: "interface", label: "Interface", note: "HUD and the Character / Journal / Map screens." },
  { id: "quests", label: "Quests & Story", note: "Objectives, triggers, and openings." },
];

// Placeholder mod catalog; each change is add (builds on the world) or override (replaces a key) so conflicts can be detected.
export const MOD_CATALOG = [
  {
    id: "grimdark-narrator",
    name: "Grimdark Narrator",
    author: "Vesper",
    glyph: "🖋️",
    category: "instructions",
    color: "linear-gradient(140deg,#5b5570,#2c2838)",
    summary: "Terser, darker prose and consequences that stick.",
    tags: ["tone", "narration"],
    changes: [
      { section: "AI Instructions", target: "narrationStyle", op: "override" },
      { section: "Story Overview", target: "questGenerationGuidance", op: "override" },
    ],
  },
  {
    id: "living-world",
    name: "Living World",
    author: "Coil",
    glyph: "🌍",
    category: "instructions",
    color: "linear-gradient(140deg,#3f7f6f,#1d3a33)",
    summary: "Off-screen factions and NPCs keep acting between turns.",
    tags: ["simulation"],
    changes: [
      { section: "AI Instructions", target: "generateNPCUpdates", op: "override" },
      { section: "AI Instructions", target: "worldClock", op: "add" },
    ],
  },
  {
    id: "elemental-combat",
    name: "Elemental Combat",
    author: "Veyra",
    glyph: "🔥",
    category: "systems",
    color: "linear-gradient(140deg,#b3553f,#5e2a22)",
    summary: "Splits damage into fire, frost, and shock with matching resist abilities.",
    tags: ["combat", "magic"],
    changes: [
      { section: "Combat Settings", target: "damageTypes", op: "override" },
      { section: "Abilities", target: "Flame Ward", op: "add" },
      { section: "Abilities", target: "Frost Ward", op: "add" },
      { section: "Abilities", target: "Storm Ward", op: "add" },
      { section: "Skills", target: "Elemental Arts", op: "add" },
    ],
  },
  {
    id: "survival-systems",
    name: "Survival Systems",
    author: "Hollowpine",
    glyph: "🍖",
    category: "systems",
    color: "linear-gradient(140deg,#b07a3f,#523819)",
    summary: "Hunger, thirst, and foraging turn the wilds into a real threat.",
    tags: ["survival"],
    changes: [
      { section: "Resources", target: "Hunger", op: "add" },
      { section: "Resources", target: "Thirst", op: "add" },
      { section: "Skills", target: "Foraging", op: "add" },
      { section: "Items", target: "Rations", op: "add" },
      { section: "Item Settings", target: "itemCategories", op: "override" },
    ],
  },
  {
    id: "crafting-expanded",
    name: "Crafting Expanded",
    author: "Tinker",
    glyph: "🔨",
    category: "systems",
    color: "linear-gradient(140deg,#3f7fb3,#1d3a52)",
    summary: "Stations, recipes, and a smithing skill for makers.",
    tags: ["crafting"],
    changes: [
      { section: "Item Settings", target: "itemCategories", op: "override" },
      { section: "Items", target: "Forge", op: "add" },
      { section: "Skills", target: "Smithing", op: "add" },
    ],
  },
  {
    id: "sanity-madness",
    name: "Sanity & Madness",
    author: "Noct",
    glyph: "🌀",
    category: "systems",
    color: "linear-gradient(140deg,#6a3fb3,#2e1d52)",
    summary: "A sanity bar that frays under horror and bends the narration.",
    tags: ["horror"],
    changes: [
      { section: "Resources", target: "Sanity", op: "add" },
      { section: "Abilities", target: "Steel Nerves", op: "add" },
      { section: "Combat Settings", target: "statusEffects", op: "override" },
    ],
  },
  {
    id: "faction-politics",
    name: "Faction Politics+",
    author: "Marrow",
    glyph: "⚖️",
    category: "content",
    color: "linear-gradient(140deg,#a13f4f,#4d1d24)",
    summary: "Standing, reputation, and rival powers that react to your choices.",
    tags: ["politics"],
    changes: [
      { section: "Resources", target: "Reputation", op: "add" },
      { section: "Factions", target: "The Concord", op: "add" },
      { section: "Factions", target: "Ashen Hand", op: "add" },
      { section: "World Lore", target: "The Long Truce", op: "add" },
    ],
  },
  {
    id: "bigger-bestiary",
    name: "Bigger Bestiary",
    author: "Quill",
    glyph: "🐉",
    category: "content",
    color: "linear-gradient(140deg,#5aa53f,#274d1d)",
    summary: "New creature types and named threats roaming the map.",
    tags: ["creatures"],
    changes: [
      { section: "Combat Settings", target: "damageTypes", op: "override" },
      { section: "NPC Types", target: "Wyvern", op: "add" },
      { section: "NPC Types", target: "Bog Lurker", op: "add" },
      { section: "NPCs", target: "The Pale Warden", op: "add" },
    ],
  },
  {
    id: "lost-histories",
    name: "Lost Histories",
    author: "Sable",
    glyph: "📜",
    category: "content",
    color: "linear-gradient(140deg,#a98a3f,#4d3c18)",
    summary: "Ruins, relics, and lore entries that deepen the backstory.",
    tags: ["lore"],
    changes: [
      { section: "World Lore", target: "The Sunken Age", op: "add" },
      { section: "World Lore", target: "The First Wardens", op: "add" },
      { section: "Locations", target: "The Drowned Vault", op: "add" },
    ],
  },
  {
    id: "hardcore-rules",
    name: "Hardcore Rules",
    author: "Drix",
    glyph: "💀",
    category: "rules",
    color: "linear-gradient(140deg,#6b7280,#33373d)",
    summary: "Tighter numbers, deadlier hits, and permadeath for the brave.",
    tags: ["difficulty"],
    changes: [
      { section: "Combat Settings", target: "damageTypes", op: "override" },
      { section: "Resources", target: "Health", op: "override" },
      { section: "Attributes", target: "startingAttributePoints", op: "override" },
    ],
  },
  {
    id: "forgiving-mode",
    name: "Forgiving Mode",
    author: "Wren",
    glyph: "🌿",
    category: "rules",
    color: "linear-gradient(140deg,#4f9e87,#1f4036)",
    summary: "Gentler health, no permadeath, softer failure states.",
    tags: ["difficulty", "accessibility"],
    changes: [
      { section: "Resources", target: "Health", op: "override" },
      { section: "Death", target: "permadeath", op: "override" },
    ],
  },
  {
    id: "minimal-hud",
    name: "Minimal HUD",
    author: "Flux",
    glyph: "📱",
    category: "interface",
    color: "linear-gradient(140deg,#4a4a6b,#222236)",
    summary: "Strips the play HUD to bars and the input, nothing else.",
    tags: ["ui"],
    changes: [{ section: "Interface", target: "Play HUD", op: "override" }],
  },
  {
    id: "companion-panel",
    name: "Companion Panel",
    author: "Echo",
    glyph: "👥",
    category: "interface",
    color: "linear-gradient(140deg,#3f6fb0,#1d3352)",
    summary: "A party widget plus a richer Character screen layout.",
    tags: ["ui", "party"],
    changes: [
      { section: "Interface", target: "Party Widget", op: "add" },
      { section: "Interface", target: "Character screen", op: "override" },
    ],
  },
  {
    id: "dynamic-bounties",
    name: "Dynamic Bounties",
    author: "Tally",
    glyph: "📌",
    category: "quests",
    color: "linear-gradient(140deg,#b07a3f,#52381b)",
    summary: "Procedural bounty board that refreshes as you clear it.",
    tags: ["quests"],
    changes: [
      { section: "Quests", target: "Bounty Board", op: "add" },
      { section: "Triggers", target: "onBountyComplete", op: "add" },
    ],
  },
  {
    id: "branching-origins",
    name: "Branching Origins",
    author: "Fable",
    glyph: "🚩",
    category: "quests",
    color: "linear-gradient(140deg,#8a3fb3,#3a1d52)",
    summary: "Extra story starts, each with its own background traits.",
    tags: ["story", "character"],
    changes: [
      { section: "Story Starts", target: "Exile's Road", op: "add" },
      { section: "Story Starts", target: "Born to the Guild", op: "add" },
      { section: "Traits", target: "Outcast", op: "add" },
    ],
  },
];

export function modById(id) {
  return MOD_CATALOG.find((mod) => mod.id === id) ?? null;
}

// xedit-style detection: any section+target touched by two or more enabled mods clashes; the last in load order wins.
export function computeConflicts(enabledIds) {
  const touches = new Map();
  enabledIds.forEach((id, order) => {
    const mod = modById(id);
    if (!mod) return;
    for (const change of mod.changes) {
      const key = `${change.section} ${change.target}`;
      if (!touches.has(key)) touches.set(key, { section: change.section, target: change.target, mods: [] });
      touches.get(key).mods.push({ modId: id, name: mod.name, op: change.op, order });
    }
  });

  const conflicts = [];
  for (const entry of touches.values()) {
    if (entry.mods.length < 2) continue;
    const winner = entry.mods.reduce((top, item) => (item.order > top.order ? item : top));
    conflicts.push({ section: entry.section, target: entry.target, mods: entry.mods, winner: winner.name });
  }
  return conflicts;
}
