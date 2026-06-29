// Seed project: a neutral sample world plus default systems and a starter HUD, so every panel opens with real content to edit.
export function defaultProject() {
  return {
    meta: { name: "Aldermoor", tagline: "A frontier town at the edge of settled land." },

    storySettings: {
      worldBackground:
        "Aldermoor is the last chartered town before the open frontier, governed by a Town Council that balances the trade guilds against the wardens who patrol the wildlands. Stable enough that ordinary people travel its roads, brittle enough that everyone is quietly preparing for the season the wards fail. The player arrives as a newly sworn warden on their first posting.",
      questGenerationGuidance:
        "Favour grounded, low-magic objectives: escorting trade, mapping the frontier, settling disputes between guild and warden. Escalate slowly; the wilds should feel earned, not handed over.",
    },

    worldLore: {
      "Town Council": { text: "The elected body that governs Aldermoor, drawn from the trade guilds and the warden order. It keeps the peace by keeping both factions dependent on it." },
      "The Wards": {
        text: "A ring of old standing-stones around the settled land that dull the instincts of wild things. Their power has waned for three seasons running, and no one alive remembers how they were raised.",
      },
    },

    factions: {
      "Town Council": {
        name: "Town Council",
        basicInfo: "The elected body that governs Aldermoor, drawn from the trade guilds and the warden order. It keeps the peace by keeping both factions dependent on it.",
        factionType: "major",
        known: true,
      },
      "Warden Order": {
        name: "Warden Order",
        basicInfo: "The sworn patrol of the wildlands beyond the wards. Underfunded, overstretched, and the only thing standing between the town and the frontier.",
        factionType: "minor",
        known: true,
      },
    },

    realms: {
      "The Frontier": { name: "The Frontier", basicInfo: "The settled land around Aldermoor and the open wilds beyond it.", known: true },
    },

    regions: {
      Aldermoor: { name: "Aldermoor", basicInfo: "The chartered town and its surrounding farmland, ringed by the standing-stones.", x: 0, y: 0, realm: "The Frontier", known: true },
      "The Reach": { name: "The Reach", basicInfo: "Open wildland north of the wards: scrub, broken hills, and the first untamed forest.", x: 0, y: 1, realm: "The Frontier", known: true },
    },

    locations: {
      "Council Hall": {
        name: "Council Hall",
        basicInfo: "The stone heart of Aldermoor where the Council sits and wardens are sworn in.",
        region: "Aldermoor",
        x: 0,
        y: 0,
        radius: 3,
        complexityType: "complex",
        known: true,
      },
      "Lower Market": {
        name: "Lower Market",
        basicInfo: "The trade quarter: stalls, a caravanserai, and the guild counting-houses.",
        region: "Aldermoor",
        x: -8,
        y: 4,
        radius: 3,
        complexityType: "complex",
        known: true,
      },
      "Warden Post": {
        name: "Warden Post",
        basicInfo: "A timber outpost at the edge of the wards where patrols muster before riding into the Reach.",
        region: "The Reach",
        x: 2,
        y: -6,
        radius: 2,
        complexityType: "simple",
        known: true,
      },
    },

    npcTypes: {
      Townsfolk: { name: "Townsfolk", description: "Ordinary residents of Aldermoor. Non-combatant, helpful, talkative.", vulnerabilities: [], resistances: [], immunities: [] },
    },

    npcs: {
      "Steward Hale": {
        name: "Steward Hale",
        type: "Townsfolk",
        currentLocation: "Council Hall",
        currentArea: "Council Floor",
        basicInfo: "The Council's steward, who handles wardens' postings and the town's ledgers.",
        personality: ["precise", "harried", "loyal"],
        faction: "Town Council",
        known: true,
      },
      "Captain Bress": {
        name: "Captain Bress",
        type: "",
        currentLocation: "Warden Post",
        currentArea: "Muster Yard",
        basicInfo: "The ranking warden at the Post, responsible for every patrol that rides north.",
        personality: ["blunt", "protective", "tired"],
        faction: "Warden Order",
        tier: "strong",
        known: true,
      },
    },

    items: {
      "Warden's Charter": {
        name: "Warden's Charter",
        category: "Document",
        description: "A sealed writ naming the bearer a sworn warden of Aldermoor, granting passage through the wards.",
        bonuses: [],
      },
      "Trail Rations": { name: "Trail Rations", category: "Consumable", description: "Dried provisions for the frontier. Restores fuel for a day's travel.", bonuses: [] },
    },

    quests: {
      "First Posting": {
        name: "First Posting",
        questSource: "Steward Hale",
        questStatement: "Hale hands the newly sworn warden their charter and a posting to the Warden Post, with word that the northern wards are failing.",
        mainObjective: "Report to Captain Bress at the Warden Post.",
        completionCondition: "The player reaches the Warden Post and speaks with Captain Bress.",
        questType: "travel",
      },
    },

    storyStarts: {
      "Sworn In": {
        name: "Sworn In",
        description: "Begin on the day you take the warden's oath in Council Hall.",
        storyStart: "The Council floor is cold at dawn. Steward Hale holds out your charter and your first posting in the same hand.",
        locations: ["Council Hall"],
        locationAreas: ["Council Floor"],
        startingQuests: ["First Posting"],
        isDefault: true,
      },
    },

    attributeSettings: {
      attributeNames: ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"],
      startingAttributeValue: 8,
      startingAttributePoints: 6,
      maxStartingAttribute: 14,
    },

    resourceSettings: {
      health: { name: "health", initialValue: 30, maxValue: 30, rechargeRate: 0, color: "#3fb950", isHealth: true, gainPerLevel: 5 },
      stamina: { name: "stamina", initialValue: 20, maxValue: 20, rechargeRate: 2, color: "#79b8ff", isHealth: false, gainPerLevel: 2 },
    },

    skills: {
      Riding: { name: "Riding", type: "utility", attribute: "dexterity", description: "Handle a mount across rough frontier ground. DC 10 for an easy trail, DC 20 to ride through a hazard." },
      Survey: { name: "Survey", type: "utility", attribute: "wisdom", description: "Read terrain, weather, and tracks. DC 10 to find a path, DC 20 to read a fading trail." },
    },

    traits: {
      "Warden-Trained": {
        name: "Warden-Trained",
        description: "Years on patrol before your oath. You start knowing the frontier.",
        quirk: "Speaks plainly, distrusts guild promises.",
        skills: [{ skill: "Survey", modifier: 2 }],
        attributes: [],
        resources: [],
        startingItems: [],
        abilities: [],
        unlockedBy: [],
        excludedBy: [],
      },
      "Guild Apprentice": {
        name: "Guild Apprentice",
        description: "Raised in the counting-houses of the Lower Market. You know trade and people.",
        quirk: "Always calculating the angle.",
        skills: [],
        attributes: [{ attribute: "charisma", modifier: 1 }],
        resources: [],
        startingItems: [],
        abilities: [],
        unlockedBy: [],
        excludedBy: [],
      },
    },

    traitCategories: {
      Background: { name: "Background", maxSelections: 1, traits: ["Warden-Trained", "Guild Apprentice"] },
    },

    itemSettings: { currencyName: "Marks", itemCategories: ["Document", "Consumable", "Weapon", "Armor"] },

    abilities: {
      "Steady Aim": {
        name: "Steady Aim",
        description: "Take a breath before a ranged attack, trading speed for accuracy on the next shot.",
        requirements: [{ type: "skill", variable: "Riding", amount: 2 }],
        bonus: 4,
        cooldown: 2,
      },
    },

    triggers: {
      receive_posting: {
        name: "receive_posting",
        recurring: false,
        conditions: [
          { type: "party-location", operator: "equals", value: "Council Hall" },
          { type: "action", query: "The player asks Steward Hale for a posting, a duty, or where they are being sent." },
        ],
        effects: [
          { type: "write-boolean", key: "postingGiven", operator: "set", value: true },
          { type: "story", instruction: "Steward Hale hands over the sealed charter and the player's first posting: report to Captain Bress at the Warden Post, north past the wards." },
        ],
      },
      warden_post_gate: {
        name: "warden_post_gate",
        recurring: true,
        conditions: [
          { type: "party-location", operator: "equals", value: "Warden Post" },
          { type: "read-boolean", key: "postingGiven", operator: "equals", value: false },
        ],
        effects: [
          { type: "party-location", operator: "set", value: "Council Hall" },
          { type: "story", instruction: "The wards turn the player back before they reach the Post. Without a sworn posting, the standing-stones will not let them ride north." },
        ],
      },
      arrive_warden_post: {
        name: "arrive_warden_post",
        recurring: false,
        conditions: [
          { type: "party-location", operator: "equals", value: "Warden Post" },
          { type: "read-boolean", key: "postingGiven", operator: "equals", value: true },
        ],
        effects: [
          { type: "write-boolean", key: "postingComplete", operator: "set", value: true },
          { type: "story", instruction: "The player rides into the muster yard and reports to Captain Bress. The first posting is done." },
        ],
      },
      ward_watch: {
        name: "ward_watch",
        recurring: true,
        conditions: [{ type: "game-tick", operator: "greaterThanOrEqual", value: 1 }],
        script: "storage.wardTicks = (storage.wardTicks || 0) + 1\nif (storage.wardTicks % 25 !== 0) { skip = true }",
        effects: [{ type: "story", instruction: "Somewhere on the ring, a ward-stone flickers and dims. The frontier feels a little closer than it did." }],
      },
    },

    systems: defaultSystems(),
    ui: defaultUI(),
  };
}

// A clean slate: the engine defaults and a starter HUD, but no authored world content. Reset lands here; Import Larion repopulates.
export function blankProject() {
  return {
    meta: { name: "Untitled world" },
    systems: defaultSystems(),
    ui: defaultUI(),
  };
}

// Default game-systems layer: strong defaults plus a fully authored Survival system that demos the mechanical-first flow end to end.
export function defaultSystems() {
  return [
    {
      id: "skillchecks",
      name: "Skill Checks",
      icon: "🎲",
      layer: "game",
      status: "customized",
      description: "Momentum and advantage feed the roll; the narrator rates difficulty, the engine applies the modifier.",
      components: [
        { id: "sc_mom", name: "momentum", type: "int", min: 0, max: 5, default: 0, note: "builds on a flourish, spent at 3+ for a bonus" },
        { id: "sc_advc", name: "advantage", type: "bool", default: false, note: "next check rolls with advantage, then consumed" },
        {
          id: "sc_attempt",
          name: "attempting",
          sensed: true,
          valueType: "enum",
          options: ["routine", "tricky", "dangerous"],
          instruction: "Rate how hard the action the player is attempting is: routine for ordinary tasks, tricky for risky or skilled moves, dangerous for high-stakes attempts under pressure.",
        },
        { id: "sc_flo", name: "flourish", sensed: true, valueType: "bool", options: [], instruction: "True when the player just succeeded with flair or pulled off a clever maneuver this turn." },
      ],
      handlers: [
        {
          id: "sc_h_flo",
          event: "onTurnStart",
          when: { mode: "all", clauses: [{ ref: { kind: "flag", name: "flourish" }, op: "is true", value: "" }] },
          effects: [
            { kind: "add", target: "momentum", value: 1 },
            { kind: "narrate", text: "Confidence builds into momentum." },
          ],
        },
        {
          id: "sc_h_adv",
          event: "onSkillCheck",
          when: { mode: "all", clauses: [{ ref: { kind: "component", name: "advantage" }, op: "==", value: true }] },
          effects: [
            { kind: "check", value: 3 },
            { kind: "set", target: "advantage", value: false },
            { kind: "narrate", text: "Set up well, the attempt comes easier." },
          ],
        },
        { id: "sc_h_mom", event: "onSkillCheck", when: { mode: "all", clauses: [{ ref: { kind: "component", name: "momentum" }, op: ">=", value: 3 }] }, effects: [{ kind: "check", value: 2 }] },
        {
          id: "sc_h_tricky",
          event: "onSkillCheck",
          when: { mode: "all", clauses: [{ ref: { kind: "flag", name: "attempting" }, op: "==", value: "tricky" }] },
          effects: [{ kind: "check", value: -1 }],
        },
        {
          id: "sc_h_danger",
          event: "onSkillCheck",
          when: { mode: "all", clauses: [{ ref: { kind: "flag", name: "attempting" }, op: "==", value: "dangerous" }] },
          effects: [{ kind: "check", value: -3 }],
        },
      ],
    },
    {
      id: "combat",
      name: "Combat & Damage",
      icon: "⚔️",
      layer: "game",
      status: "customized",
      description: "Rage builds with every blow and discharges as a crit; a crushing hit staggers your guard.",
      components: [
        { id: "cb_armor", name: "armor", type: "int", min: 0, max: 50, default: 12, note: "flat reduction on incoming damage" },
        { id: "cb_rage", name: "rage", type: "int", min: 0, max: 100, default: 0, note: "rises each hit, spent on a crit at 50" },
        {
          id: "cb_blow",
          name: "blow",
          sensed: true,
          valueType: "enum",
          options: ["none", "glancing", "solid", "crushing"],
          instruction: "Rate the incoming hit the player takes this turn: none if unhurt, glancing for a light graze, solid for a clean hit, crushing for a heavy, staggering blow.",
        },
      ],
      handlers: [
        {
          id: "cb_h_solid",
          event: "onDamageTaken",
          when: { mode: "all", clauses: [{ ref: { kind: "flag", name: "blow" }, op: "==", value: "solid" }] },
          effects: [{ kind: "add", target: "rage", value: 10 }],
        },
        {
          id: "cb_h_crush",
          event: "onDamageTaken",
          when: { mode: "all", clauses: [{ ref: { kind: "flag", name: "blow" }, op: "==", value: "crushing" }] },
          effects: [
            { kind: "add", target: "rage", value: 25 },
            { kind: "status", label: "Stagger", group: "control", target: "armor", value: -6, turns: 1, scope: "self" },
            { kind: "narrate", text: "The crushing blow rattles their guard." },
          ],
        },
        { id: "cb_h_deal", event: "onDealDamage", when: { mode: "all", clauses: [] }, effects: [{ kind: "add", target: "rage", value: 15 }] },
        {
          id: "cb_h_crit",
          event: "onDealDamage",
          when: { mode: "all", clauses: [{ ref: { kind: "component", name: "rage" }, op: ">=", value: 50 }] },
          effects: [
            { kind: "set", target: "rage", value: 0 },
            { kind: "emit", event: "crit" },
            { kind: "narrate", text: "They convert the built fury into a devastating critical strike." },
          ],
        },
        {
          id: "cb_h_end",
          event: "onCombatEnd",
          when: { mode: "all", clauses: [] },
          effects: [
            { kind: "set", target: "rage", value: 0 },
            { kind: "clearStatus", group: "control" },
          ],
        },
      ],
    },
    {
      id: "progression",
      name: "Progression",
      icon: "📈",
      layer: "game",
      status: "customized",
      description: "The narrator rates each deed; XP accrues and rolls into a level-up that grants skill points.",
      components: [
        { id: "pr_xp", name: "xp", type: "int", min: 0, max: 200, default: 0, note: "accumulates toward the next level" },
        { id: "pr_level", name: "level", type: "int", min: 1, max: 20, default: 1 },
        { id: "pr_sp", name: "skillPoints", type: "int", min: 0, max: 50, default: 0, note: "earned per level, spent to train skills" },
        {
          id: "pr_feat",
          name: "feat",
          sensed: true,
          valueType: "enum",
          options: ["none", "minor", "notable", "heroic"],
          instruction: "Rate the significance of what the player accomplished this turn: none, minor for small wins, notable for real achievements, heroic for story-defining feats.",
        },
      ],
      handlers: [
        {
          id: "pr_h_minor",
          event: "onTurnStart",
          when: { mode: "all", clauses: [{ ref: { kind: "flag", name: "feat" }, op: "==", value: "minor" }] },
          effects: [{ kind: "add", target: "xp", value: 10 }],
        },
        {
          id: "pr_h_notable",
          event: "onTurnStart",
          when: { mode: "all", clauses: [{ ref: { kind: "flag", name: "feat" }, op: "==", value: "notable" }] },
          effects: [{ kind: "add", target: "xp", value: 30 }],
        },
        {
          id: "pr_h_heroic",
          event: "onTurnStart",
          when: { mode: "all", clauses: [{ ref: { kind: "flag", name: "feat" }, op: "==", value: "heroic" }] },
          effects: [
            { kind: "add", target: "xp", value: 75 },
            { kind: "narrate", text: "A heroic deed, the kind bards remember." },
          ],
        },
        {
          id: "pr_h_levelup",
          event: "onTurnStart",
          when: { mode: "all", clauses: [{ ref: { kind: "component", name: "xp" }, op: ">=", value: 100 }] },
          effects: [
            { kind: "sub", target: "xp", value: 100 },
            { kind: "add", target: "level", value: 1 },
            { kind: "add", target: "skillPoints", value: 2 },
            { kind: "emit", event: "levelUp" },
            { kind: "narrate", text: "Level up. New strength settles into the bones." },
          ],
        },
      ],
    },
    {
      id: "crafting",
      name: "Crafting",
      icon: "🔨",
      layer: "game",
      status: "custom",
      description: "Recipes, stations, and ingredients consumed to produce items.",
      components: [
        { id: "recipe", name: "recipe", type: "map", note: "ingredient → quantity" },
        { id: "station", name: "station", type: "list", note: "stations the player can reach" },
      ],
      handlers: [{ id: "craft1", event: "onCraftItem", when: { mode: "all", clauses: [] }, effects: [{ kind: "emit", event: "crafted" }] }],
    },
    {
      id: "survival",
      name: "Survival · Hunger",
      icon: "🍖",
      layer: "game",
      status: "custom",
      description: "Hunger and thirst drain per turn; exertion burns more; going without bites your checks.",
      components: [
        { id: "hunger", name: "hunger", type: "int", min: 0, max: 100, default: 100, note: "0 = starving" },
        { id: "thirst", name: "thirst", type: "int", min: 0, max: 100, default: 100, note: "0 = parched; drains faster than hunger" },
        {
          id: "exerting",
          name: "exerting",
          sensed: true,
          valueType: "enum",
          options: ["idle", "walking", "running", "sprinting"],
          instruction:
            "Read the turn and report the player's physical effort: idle if resting or talking, walking for ordinary movement, running when hurrying, sprinting when fleeing, fighting hard, or climbing.",
        },
      ],
      handlers: [
        {
          id: "h_turn",
          event: "onTurnStart",
          when: { mode: "all", clauses: [] },
          effects: [
            { kind: "sub", target: "hunger", value: 5 },
            { kind: "sub", target: "thirst", value: 8 },
          ],
        },
        {
          id: "h_sprint",
          event: "onTurnStart",
          when: { mode: "all", clauses: [{ ref: { kind: "flag", name: "exerting" }, op: "==", value: "sprinting" }] },
          effects: [
            { kind: "sub", target: "hunger", value: 5 },
            { kind: "sub", target: "thirst", value: 6 },
            { kind: "narrate", text: "The hard exertion burns through food and water." },
          ],
        },
        {
          id: "h_run",
          event: "onTurnStart",
          when: { mode: "all", clauses: [{ ref: { kind: "flag", name: "exerting" }, op: "==", value: "running" }] },
          effects: [{ kind: "sub", target: "thirst", value: 3 }],
        },
        { id: "h_check", event: "onSkillCheck", when: { mode: "all", clauses: [{ ref: { kind: "component", name: "hunger" }, op: "<=", value: 0 }] }, effects: [{ kind: "check", value: -2 }] },
        { id: "h_thirst", event: "onSkillCheck", when: { mode: "all", clauses: [{ ref: { kind: "component", name: "thirst" }, op: "<=", value: 0 }] }, effects: [{ kind: "check", value: -3 }] },
      ],
    },
    {
      id: "factions",
      name: "Factions & Reputation",
      icon: "🤝",
      layer: "game",
      status: "customized",
      description: "The narrator flags reputation-affecting deeds; standing with each faction and overall infamy shift in response.",
      components: [
        { id: "fc_council", name: "councilStanding", type: "int", min: -100, max: 100, default: 0, note: "reputation with the Town Council" },
        { id: "fc_warden", name: "wardenStanding", type: "int", min: -100, max: 100, default: 0, note: "reputation with the Warden Order" },
        { id: "fc_infamy", name: "infamy", type: "int", min: 0, max: 100, default: 0, note: "how notorious the party has become" },
        {
          id: "fc_deed",
          name: "deed",
          sensed: true,
          valueType: "enum",
          options: ["none", "aidedCouncil", "crossedCouncil", "aidedWardens", "crossedWardens", "lawless"],
          instruction:
            "Classify any reputation-affecting action this turn: aidedCouncil or crossedCouncil for helping or wronging the Town Council, aidedWardens or crossedWardens for the Warden Order, lawless for open crime, or none.",
        },
      ],
      handlers: [
        {
          id: "fc_h_aidc",
          event: "onTurnStart",
          when: { mode: "all", clauses: [{ ref: { kind: "flag", name: "deed" }, op: "==", value: "aidedCouncil" }] },
          effects: [
            { kind: "add", target: "councilStanding", value: 10 },
            { kind: "narrate", text: "Word of the favour reaches the Council." },
          ],
        },
        {
          id: "fc_h_crossc",
          event: "onTurnStart",
          when: { mode: "all", clauses: [{ ref: { kind: "flag", name: "deed" }, op: "==", value: "crossedCouncil" }] },
          effects: [
            { kind: "sub", target: "councilStanding", value: 15 },
            { kind: "add", target: "infamy", value: 5 },
          ],
        },
        {
          id: "fc_h_aidw",
          event: "onTurnStart",
          when: { mode: "all", clauses: [{ ref: { kind: "flag", name: "deed" }, op: "==", value: "aidedWardens" }] },
          effects: [{ kind: "add", target: "wardenStanding", value: 10 }],
        },
        {
          id: "fc_h_crossw",
          event: "onTurnStart",
          when: { mode: "all", clauses: [{ ref: { kind: "flag", name: "deed" }, op: "==", value: "crossedWardens" }] },
          effects: [
            { kind: "sub", target: "wardenStanding", value: 15 },
            { kind: "add", target: "infamy", value: 5 },
          ],
        },
        {
          id: "fc_h_lawless",
          event: "onTurnStart",
          when: { mode: "all", clauses: [{ ref: { kind: "flag", name: "deed" }, op: "==", value: "lawless" }] },
          effects: [
            { kind: "add", target: "infamy", value: 12 },
            { kind: "sub", target: "councilStanding", value: 5 },
            { kind: "sub", target: "wardenStanding", value: 5 },
          ],
        },
        {
          id: "fc_h_notorious",
          event: "onTurnStart",
          when: { mode: "all", clauses: [{ ref: { kind: "component", name: "infamy" }, op: ">=", value: 50 }] },
          effects: [{ kind: "narrate", text: "Their notoriety precedes them; guards watch and doors quietly close." }],
        },
      ],
    },
  ];
}

// Default in-game UI across the customizable screens (Play HUD plus Character / Journal / Map tabs), seeded to show the bar→emote example directly.
export function defaultUI() {
  const emptyScreens = () => ({
    play: { party: [], hud: [], act: [] },
    character: { body: [] },
    journal: { body: [] },
    map: { body: [] },
  });
  const always = () => ({ mode: "all", clauses: [] });
  const desktop = emptyScreens();
  desktop.play.hud = [
    { id: "w_hunger", component: "hunger", label: "Hunger", widget: "icons", color: "#ffb951", icon: "🍗", per: 10, visibleWhen: always() },
    {
      id: "w_thirstlow",
      component: "thirst",
      label: "Parched",
      widget: "pill",
      color: "#ffaab5",
      visibleWhen: { mode: "all", clauses: [{ ref: { kind: "component", name: "thirst" }, op: "<=", value: 15 }] },
    },
  ];
  desktop.play.act = [{ id: "w_rest", component: "Rest", label: "Rest", widget: "button", color: "#79b8ff", visibleWhen: always() }];
  desktop.character.body = [{ id: "w_thirst", component: "thirst", label: "Thirst", widget: "bar", color: "#79b8ff", visibleWhen: always() }];

  return {
    parity: "responsive",
    party: ["Wren", "Castor", "Vael", "Mira"],
    location: "Aldermoor — Council Hall",
    desktop,
    mobile: emptyScreens(),
  };
}
