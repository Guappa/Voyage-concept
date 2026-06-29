<script>
  import { store, view, uid } from "../lib/store.svelte.js";

  const C = (mode, clauses) => ({ mode, clauses });
  const flag = (name, op, value = "") => ({ ref: { kind: "flag", name }, op, value });
  const comp = (name, op, value = "") => ({ ref: { kind: "component", name }, op, value });

  // starter shapes so a creator can begin from a recognisable mechanic instead of a blank system
  const TEMPLATES = [
    {
      name: "Vehicle",
      icon: "🚗",
      description: "Fuel that drains while driving, faster at speed, and an engine that dies when it runs dry.",
      components: [
        { name: "fuel", type: "float", min: 0, max: 100, default: 100 },
        { name: "speed", type: "int", min: 0, max: 10, default: 4 },
        { name: "driving", sensed: true, valueType: "bool", options: [], instruction: "True while the player is actively operating or riding the vehicle; false when parked, stopped, or on foot." },
      ],
      handlers: [
        { event: "onTurnStart", when: C("all", [flag("driving", "is true")]), effects: [{ kind: "sub", target: "fuel", value: 2 }] },
        { event: "onTurnStart", when: C("all", [comp("speed", "rose")]), effects: [{ kind: "sub", target: "fuel", value: 3 }] },
        { event: "onTurnStart", when: C("all", [comp("speed", "fell")]), effects: [{ kind: "sub", target: "fuel", value: 1 }] },
        {
          event: "onTurnStart",
          when: C("all", [comp("fuel", "<=", 0)]),
          effects: [
            { kind: "set", target: "speed", value: 0 },
            { kind: "narrate", text: "The engine sputters and dies; the vehicle coasts to a halt." },
          ],
        },
      ],
    },
    {
      name: "Hunger",
      icon: "🍖",
      description: "Hunger that climbs over time, faster under exertion, and saps checks when it peaks.",
      components: [
        { name: "hunger", type: "int", min: 0, max: 100, default: 0 },
        { name: "straining", sensed: true, valueType: "bool", options: [], instruction: "True on any turn the player sprints, jumps, climbs, fights, or otherwise exerts themselves hard." },
      ],
      handlers: [
        { event: "onTurnStart", when: C("all", []), effects: [{ kind: "add", target: "hunger", value: 1 }] },
        { event: "onTurnStart", when: C("all", [flag("straining", "is true")]), effects: [{ kind: "add", target: "hunger", value: 3 }] },
        { event: "onSkillCheck", when: C("all", [comp("hunger", ">=", 80)]), effects: [{ kind: "check", value: -2 }] },
      ],
    },
    {
      name: "Farming",
      icon: "🌱",
      description: "Crops with growth stages that advance each turn while watered.",
      components: [
        { name: "growth", type: "int", min: 0, max: 4, default: 0 },
        { name: "watered", type: "bool", default: false },
      ],
      handlers: [{ event: "onTurnStart", when: C("all", [comp("watered", "==", "true")]), effects: [{ kind: "add", target: "growth", value: 1 }] }],
    },
    {
      name: "Wounds",
      icon: "🩸",
      description: "Lasting injuries that accumulate and bite on the next check.",
      components: [{ name: "wounds", type: "int", min: 0, max: 5, default: 0 }],
      handlers: [
        { event: "onDamageTaken", when: C("all", []), effects: [{ kind: "add", target: "wounds", value: 1 }] },
        { event: "onSkillCheck", when: C("all", [comp("wounds", ">=", 3)]), effects: [{ kind: "check", value: -2 }] },
      ],
    },
    {
      name: "Warding Shield",
      icon: "🛡️",
      description:
        "The mechanical half of a Warding Shield ability: a ward worth 10% of HP that soaks damage for two turns and replaces any earlier ward. The ability triggers it; the rule lives here.",
      components: [
        { name: "HP", type: "int", min: 0, max: 200, default: 120 },
        { name: "Shield", type: "int", min: 0, max: 60, default: 0 },
      ],
      handlers: [
        {
          event: "onUseAbility",
          subject: "Warding Shield",
          when: C("all", []),
          effects: [
            { kind: "clearStatus", group: "shield" },
            { kind: "status", label: "Warding Shield", group: "shield", turns: 2, target: "Shield", value: { expr: "HP * 0.1" }, scope: "allies" },
            { kind: "narrate", text: "A ward of force settles over the allies, ready to soak the next blows." },
          ],
        },
        {
          event: "onDamageTaken",
          when: C("all", [comp("Shield", ">", 0)]),
          effects: [
            { kind: "sub", target: "Shield", value: 4 },
            { kind: "narrate", text: "The ward flares and absorbs part of the hit." },
          ],
        },
      ],
    },
  ];

  function open(id) {
    view.systemId = id;
    view.section = "build";
  }

  function addBlank() {
    const id = uid("sys");
    store.project.systems = [...store.project.systems, { id, name: "New System", icon: "✨", layer: "game", status: "custom", description: "", components: [], handlers: [] }];
    open(id);
  }

  function addTemplate(tpl) {
    const id = uid("sys");
    const cloned = JSON.parse(JSON.stringify({ components: tpl.components, handlers: tpl.handlers }));
    cloned.components.forEach((c) => (c.id = uid("c")));
    cloned.handlers.forEach((h) => (h.id = uid("h")));
    store.project.systems = [
      ...store.project.systems,
      { id, name: tpl.name, icon: tpl.icon, layer: "game", status: "custom", description: tpl.description, components: cloned.components, handlers: cloned.handlers },
    ];
    open(id);
  }

  const statusLabel = { default: "Default", customized: "Customized", custom: "Custom" };
</script>

<div class="crumb">Engine · <b>Game Systems</b> · the replaceable layer</div>
<h1>Game Systems</h1>
<p class="blurb">
  The engine splits into a fixed core and a replaceable game-systems layer. Systems ship with strong defaults; swap one, tune it, or build a new one from typed components and events. The same
  components feed the <b>UI Builder</b>, so a mechanic you define also shows up natively in the player's HUD.
</p>

<div class="grid">
  {#each store.project.systems as sys}
    <button class="card sys" onclick={() => open(sys.id)}>
      <div class="top">
        <span class="ic">{sys.icon}</span>
        <h3>{sys.name}</h3>
      </div>
      <p class="desc">{sys.description}</p>
      <div class="foot">
        <span class="st {sys.status}">{statusLabel[sys.status]}</span>
        {#if sys.components.length}<span class="meta">{sys.components.length} comp · {sys.handlers.length} rules</span>{/if}
      </div>
    </button>
  {/each}

  <button class="card add" onclick={addBlank}>
    <span class="plus">＋</span>
    <div>
      <h3>Build a custom system</h3>
      <p>Typed components and event-driven systems. Sandboxed, deterministic, rendered as a real mechanic.</p>
    </div>
  </button>
</div>

<h2>Start from a template</h2>
<div class="tpls">
  {#each TEMPLATES as tpl}
    <button class="tpl" onclick={() => addTemplate(tpl)}>
      <span class="ic">{tpl.icon}</span>
      <div>
        <b>{tpl.name}</b>
        <p>{tpl.description}</p>
      </div>
    </button>
  {/each}
</div>

<style>
  .crumb {
    font-size: 15.5px;
    color: var(--muted);
    margin-bottom: 8px;
  }
  .crumb b {
    color: var(--text);
  }
  h1 {
    font-size: 28.5px;
    margin-bottom: 5px;
  }
  h2 {
    font-size: 17.5px;
    margin: 26px 0 12px;
  }
  .blurb {
    color: var(--muted);
    font-size: 16.5px;
    max-width: 740px;
    margin-bottom: 20px;
  }
  .blurb b {
    color: var(--text);
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
  }
  .card {
    text-align: left;
    background: var(--bg-subtle);
    border: 1px solid var(--border-subtle);
    border-radius: var(--r-lg);
    box-shadow: var(--shadow-card);
    padding: 15px;
    cursor: pointer;
    transition: 0.16s;
  }
  .card:hover {
    box-shadow: var(--shadow-hover);
    border-color: var(--border);
  }
  .top {
    display: flex;
    align-items: center;
    gap: 9px;
    margin-bottom: 6px;
  }
  .ic {
    width: 28px;
    height: 28px;
    border-radius: var(--r-sm);
    background: var(--accent-soft);
    color: var(--accent);
    display: grid;
    place-items: center;
    font-size: 16.5px;
  }
  h3 {
    font-size: 17px;
    font-weight: 650;
  }
  .desc {
    font-size: 15px;
    color: var(--muted);
    margin: 4px 0 12px;
    line-height: 1.5;
    min-height: 36px;
  }
  .foot {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .st {
    font-size: 12.5px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 20px;
  }
  .st.default {
    color: var(--muted);
    background: var(--bg);
  }
  .st.customized {
    color: var(--warning);
    background: color-mix(in srgb, var(--warning) 13%, transparent);
  }
  .st.custom {
    color: var(--accent);
    background: var(--accent-soft);
  }
  .meta {
    margin-left: auto;
    font-size: 13px;
    color: var(--muted);
  }
  .add {
    display: flex;
    align-items: center;
    gap: 14px;
    border-style: dashed;
  }
  .add:hover {
    border-color: var(--accent);
    background: var(--accent-soft);
  }
  .plus {
    width: 42px;
    height: 42px;
    border-radius: 11px;
    background: var(--accent-soft);
    color: var(--accent);
    display: grid;
    place-items: center;
    font-size: 26px;
    flex-shrink: 0;
  }
  .add p {
    color: var(--muted);
    font-size: 15px;
    margin-top: 2px;
  }
  .tpls {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }
  .tpl {
    display: flex;
    gap: 11px;
    align-items: flex-start;
    text-align: left;
    background: var(--bg-subtle);
    border: 1px solid var(--border-subtle);
    border-radius: var(--r-md);
    padding: 13px;
    cursor: pointer;
    color: var(--text);
  }
  .tpl:hover {
    border-color: var(--accent);
  }
  .tpl b {
    color: var(--heading);
  }
  .tpl p {
    color: var(--muted);
    font-size: 14px;
    margin-top: 3px;
    line-height: 1.45;
  }
  @container page (max-width: 820px) {
    .grid,
    .tpls {
      grid-template-columns: 1fr 1fr;
    }
  }
  @container page (max-width: 540px) {
    .grid,
    .tpls {
      grid-template-columns: 1fr;
    }
  }
</style>
