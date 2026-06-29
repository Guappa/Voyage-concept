<script>
  import { store, view, uid } from "../lib/store.svelte.js";
  import { vocabulary, evalCondition, subjectInValue } from "../lib/engine/conditions.js";
  import ConditionBuilder from "../components/ConditionBuilder.svelte";

  const WIDGET_TYPES = ["bar", "icons", "number", "pill", "button"];
  const SCREENS = [
    { id: "play", label: "Play HUD", zones: ["party", "hud", "act"] },
    { id: "character", label: "Character", tabs: ["Stats", "Inventory", "Skills", "Traits", "Abilities"], zones: ["body"] },
    { id: "journal", label: "Journal", tabs: ["Quests", "Timeline", "Entries"], zones: ["body"] },
    { id: "map", label: "Map", tabs: ["World", "Location"], zones: ["body"] },
  ];

  let screen = $state("play");
  let dragPrim = $state(null);
  let selected = $state(null);
  let picker = $state(null);

  const formFactor = $derived(view.formFactor);
  const layout = $derived(store.project.ui[formFactor]);
  const parity = $derived(store.project.ui.parity);
  const supported = $derived(parity === "responsive" || parity === formFactor);

  // primitives are every system component (typed) plus a few action primitives, so the UI can only bind to real state
  const primitives = $derived.by(() => {
    const seen = new Set();
    const comps = [];
    for (const sys of store.project.systems) {
      for (const c of sys.components) {
        if (seen.has(c.name)) continue;
        seen.add(c.name);
        comps.push({ name: c.name, type: c.type, kind: "component", min: c.min, max: c.max, default: c.default });
      }
    }
    const actions = ["Rest", "Craft", "Inspect"].map((name) => ({ name, kind: "action" }));
    return [...comps, ...actions];
  });

  // the scene row reflects whoever is present at runtime, not a fixed party
  const sceneCharacters = $derived(["You", ...Object.keys(store.project.npcs ?? {}).slice(0, 3)]);

  // a mid-range sample value so bars and emote-repeats read as populated in the mockup
  function sampleValue(prim) {
    if (!prim || prim.kind !== "component") return 0;
    if (prim.type === "bool" || prim.type === "derived") return true;
    const min = prim.min ?? 0;
    const max = prim.max ?? 100;
    return Math.round(min + (max - min) * 0.7);
  }

  function primFor(name) {
    return primitives.find((p) => p.name === name);
  }

  function defaultWidget(prim) {
    if (prim.kind === "action") return "button";
    if (prim.type === "bool" || prim.type === "derived") return "pill";
    return "bar";
  }

  function addWidget(zone, prim) {
    if (!prim) return;
    const widget = {
      id: uid("w"),
      component: prim.name,
      label: prim.name[0].toUpperCase() + prim.name.slice(1),
      widget: defaultWidget(prim),
      color: "#79b8ff",
      icon: "🍗",
      per: 10,
      visibleWhen: { mode: "all", clauses: [] },
    };
    layout[screen][zone] = [...layout[screen][zone], widget];
    selected = widget.id;
    picker = null;
  }

  function removeWidget(zone, id) {
    layout[screen][zone] = layout[screen][zone].filter((w) => w.id !== id);
    if (selected === id) selected = null;
  }

  const selectedWidget = $derived.by(() => {
    for (const zone of Object.values(layout[screen])) {
      const found = zone.find((w) => w.id === selected);
      if (found) return found;
    }
    return null;
  });

  function dropOn(zone) {
    if (dragPrim) addWidget(zone, dragPrim);
    dragPrim = null;
  }

  function tapZone(zone) {
    if (formFactor === "mobile") picker = zone;
  }

  function pct(w) {
    const prim = primFor(w.component);
    const value = sampleValue(prim);
    const min = prim?.min ?? 0;
    const max = prim?.max ?? 100;
    return Math.max(0, Math.min(100, ((value - min) / (max - min || 1)) * 100));
  }

  function iconCount(w) {
    const value = sampleValue(primFor(w.component));
    return Math.max(0, Math.min(20, Math.round(value / (w.per || 10))));
  }

  const vocab = $derived(vocabulary(store.project));

  // every reference used by any visibility condition on this screen, so the preview can offer a control per ref
  const screenWidgets = $derived.by(() => {
    const out = [];
    for (const zone of Object.values(layout[screen] ?? {})) if (Array.isArray(zone)) out.push(...zone);
    return out;
  });

  function refId(clause) {
    return subjectInValue(clause.ref.kind) ? clause.ref.kind : `${clause.ref.kind}:${clause.ref.name}`;
  }

  const previewRefs = $derived.by(() => {
    const map = new Map();
    for (const widget of screenWidgets) {
      for (const clause of widget.visibleWhen?.clauses ?? []) {
        if (!clause.ref) continue;
        if (!clause.ref.name && !subjectInValue(clause.ref.kind)) continue;
        map.set(refId(clause), clause.ref);
      }
    }
    return [...map.entries()].map(([id, ref]) => ({ id, ref }));
  });

  let previewState = $state({});

  function flagOptions(name) {
    const meta = vocab.flagMeta?.find((f) => f.name === name);
    return meta?.valueType === "enum" ? (meta.options ?? []) : null;
  }

  // assembles a sample play-state from the preview controls so conditional widgets show/hide live
  const previewCtx = $derived.by(() => {
    const values = {};
    const flags = {};
    const skills = {};
    const traits = new Set();
    const items = new Set();
    const equipped = new Set();
    let charClass = "";
    let location = "";
    for (const p of primitives) if (p.kind === "component") values[p.name] = sampleValue(p);
    for (const { id, ref } of previewRefs) {
      const value = previewState[id];
      if (ref.kind === "component") values[ref.name] = Number(value ?? values[ref.name] ?? 0);
      else if (ref.kind === "flag") flags[ref.name] = value ?? false;
      else if (ref.kind === "skill") skills[ref.name] = Number(value ?? 0);
      else if (ref.kind === "trait" && value) traits.add(ref.name);
      else if (ref.kind === "item" && value) items.add(ref.name);
      else if (ref.kind === "equipped" && value) equipped.add(ref.name);
      else if (ref.kind === "class") charClass = value ?? "";
      else if (ref.kind === "location") location = value ?? "";
    }
    return { values, flags, skills, traits, items, equipped, class: charClass, location };
  });

  function isVisible(widget) {
    return evalCondition(widget.visibleWhen, previewCtx);
  }
</script>

<div class="crumb">Engine · <b>UI Builder</b></div>
<h1>UI Builder</h1>
<p class="blurb">
  Build the in-game interface from the same components your systems define. A widget binds to real state, so a mechanic you author shows up natively, not as prose. Customize the HUD and the Character
  / Journal / Map screens, per form factor.
</p>

<div class="bar">
  <div class="seg">
    {#each SCREENS as s}<button
        class:cur={screen === s.id}
        onclick={() => {
          screen = s.id;
          selected = null;
        }}>{s.label}</button
      >{/each}
  </div>
  <div class="seg">
    <button class:cur={formFactor === "desktop"} onclick={() => (view.formFactor = "desktop")}>🖥 Desktop</button>
    <button class:cur={formFactor === "mobile"} onclick={() => (view.formFactor = "mobile")}>📱 Mobile</button>
  </div>
  <label class="parity"
    >Provide for
    <select bind:value={store.project.ui.parity}>
      <option value="responsive">both (responsive)</option>
      <option value="desktop">desktop only</option>
      <option value="mobile">mobile only</option>
    </select>
  </label>
</div>

{#snippet widgetChip(zone, w)}
  <div
    class="placed"
    class:sel={selected === w.id}
    class:hidden={!isVisible(w)}
    role="button"
    tabindex="0"
    title={isVisible(w) ? "" : "Hidden by its condition in the current preview state"}
    onclick={() => (selected = w.id)}
    onkeydown={(e) => (e.key === "Enter" || e.key === " ") && (selected = w.id)}
  >
    {#if !isVisible(w)}<span class="hideflag">⊘</span>{/if}
    {#if w.widget === "bar"}
      <span class="pl-t"><span>{w.label}</span></span><span class="pl-bar"><i style="width:{pct(w)}%;background:{w.color}"></i></span>
    {:else if w.widget === "icons"}
      <span class="icons"
        >{#each Array(iconCount(w)) as _}<span>{w.icon}</span>{/each}</span
      >
    {:else if w.widget === "number"}
      <span class="pl-num">{w.label} {sampleValue(primFor(w.component))}</span>
    {:else if w.widget === "pill"}
      <span class="pl-pill" style="border-color:{w.color}">{w.label}</span>
    {:else}
      <span class="pl-btn" style="border-color:{w.color}">⚙ {w.label}</span>
    {/if}
    <button
      class="del"
      onclick={(e) => {
        e.stopPropagation();
        removeWidget(zone, w.id);
      }}
      aria-label="Remove widget">×</button
    >
  </div>
{/snippet}

{#snippet dropzone(zone, label, klass)}
  <div
    class="drop {klass}"
    class:empty={!layout[screen][zone].length}
    role="button"
    tabindex="0"
    ondragover={(e) => e.preventDefault()}
    ondrop={() => dropOn(zone)}
    onclick={() => tapZone(zone)}
    onkeydown={(e) => (e.key === "Enter" || e.key === " ") && tapZone(zone)}
  >
    {#if !layout[screen][zone].length}<span class="dlabel">{label}</span>{/if}
    {#each layout[screen][zone] as w (w.id)}{@render widgetChip(zone, w)}{/each}
  </div>
{/snippet}

<div class="uib">
  <div class="pal" class:dim={formFactor === "mobile"}>
    <div class="ph">
      <h4>Primitives</h4>
      <span class="tg">{formFactor === "mobile" ? "tap a slot" : "drag me"}</span>
    </div>
    <div class="pbody">
      <p class="palnote">{formFactor === "mobile" ? "On touch you tap an empty slot and pick a primitive — no dragging." : "The same components your systems define. Drag one onto a slot →"}</p>
      {#each primitives as p}
        <div class="prim" role="button" tabindex="0" draggable={formFactor === "desktop"} ondragstart={() => (dragPrim = p)} ondragend={() => (dragPrim = null)}>
          <span class="gico">⠿</span><span class="pn">{p.name}</span><span class="ty">{p.kind === "action" ? "act" : p.type}</span>
        </div>
      {/each}
    </div>
  </div>

  <div class="stage" class:phone={formFactor === "mobile"} class:unsupported={!supported}>
    {#if !supported}
      <div class="notprovided">
        This layout is set to <b>{parity === "desktop" ? "desktop only" : "mobile only"}</b>, so it does not render on {formFactor}. Switch the “Provide for” setting to add it.
      </div>
    {/if}

    {#if previewRefs.length}
      <div class="previewas">
        <span class="pal-h">Preview as</span>
        {#each previewRefs as { id, ref } (id)}
          <label class="pa">
            <span>{subjectInValue(ref.kind) ? ref.kind : ref.name}</span>
            {#if ref.kind === "flag" && flagOptions(ref.name)}
              <select value={previewState[id] ?? ""} onchange={(e) => (previewState[id] = e.target.value)}>
                <option value="">—</option>
                {#each flagOptions(ref.name) as opt}<option value={opt}>{opt}</option>{/each}
              </select>
            {:else if ref.kind === "flag" || ref.kind === "trait" || ref.kind === "item" || ref.kind === "equipped"}
              <input type="checkbox" checked={!!previewState[id]} onchange={(e) => (previewState[id] = e.target.checked)} />
            {:else if subjectInValue(ref.kind)}
              <select value={previewState[id] ?? ""} onchange={(e) => (previewState[id] = e.target.value)}>
                <option value="">—</option>
                {#each vocab[ref.kind] ?? [] as name}<option value={name}>{name}</option>{/each}
              </select>
            {:else}
              <input class="panum" type="number" value={previewState[id] ?? 0} onchange={(e) => (previewState[id] = Number(e.target.value))} />
            {/if}
          </label>
        {/each}
      </div>
    {/if}

    <div class="device" class:phone={formFactor === "mobile"}>
      <div class="screen">
        {#if formFactor === "desktop"}
          <div class="dvtop">
            <div class="gp"><span>👤 Character</span><span>📖 Journal</span></div>
            <div class="gp"><span>⚙ Settings</span><span>🌐 Map</span><span>💬 Chat</span></div>
          </div>
        {/if}
        <div class="dvrow"><span>Day 1 — Morning</span><span>{store.project.ui.location}</span></div>

        {#if screen === "play"}
          <div class="scenecap">Characters present in the scene · dynamic — a per-character widget renders under each</div>
          <div class="party">
            {#each sceneCharacters as name, i}
              <div class="pc">
                <div class="pcimg" style="background:linear-gradient(160deg,hsl({i * 70 + 200} 60% 70%),hsl({i * 70 + 200} 50% 45%))">{name[0]}</div>
                <div class="pchp"><i style="width:{90 - i * 7}%"></i></div>
                <div class="pcname">{name}</div>
              </div>
            {/each}
          </div>
          <div class="hudbar">{@render dropzone("hud", "HUD — drop a stat widget", "hud")}</div>
          <div class="narr">The room waits on you. Beyond the windows, the town goes about its morning business.</div>
          <div class="actbar"><span class="ab">✨ Abilities</span><span class="ab">🎯 Skills</span><span class="ab">🎒 Items</span>{@render dropzone("act", "action", "act")}</div>
          <div class="dvinput">What do you do?</div>
        {:else}
          {@const def = SCREENS.find((s) => s.id === screen)}
          <div class="modal">
            <div class="mtabs">
              {#each def.tabs as t, i}<span class:cur={i === 0}>{t}</span>{/each}
            </div>
            {@render dropzone("body", `${def.label} panel — drop widgets here`, "body")}
          </div>
        {/if}

        {#if formFactor === "mobile"}
          <div class="bottomnav"><span>👤</span><span>📖</span><span>⚙</span><span>🌐</span><span>💬</span></div>
        {/if}
      </div>
    </div>
  </div>

  <div class="insp">
    <div class="ph">
      <h4>Widget</h4>
      <span class="tg">{selectedWidget ? selectedWidget.widget : "none"}</span>
    </div>
    <div class="ib">
      {#if selectedWidget}
        <label class="f"
          ><span>Bound component</span>
          <select bind:value={selectedWidget.component}
            >{#each primitives as p}<option value={p.name}>{p.name}</option>{/each}</select
          >
        </label>
        <label class="f"><span>Label</span><input bind:value={selectedWidget.label} /></label>
        <label class="f"
          ><span>Representation</span>
          <select bind:value={selectedWidget.widget}
            >{#each WIDGET_TYPES as t}<option value={t}>{t}</option>{/each}</select
          >
        </label>
        {#if selectedWidget.widget === "icons"}
          <label class="f"><span>Icon / emote</span><input bind:value={selectedWidget.icon} maxlength="2" /></label>
          <label class="f"><span>Value per icon</span><input type="number" bind:value={selectedWidget.per} /></label>
        {/if}
        <label class="f"><span>Colour</span><input class="color" type="color" bind:value={selectedWidget.color} /></label>
        <div class="f">
          <span>Visible when</span>
          <ConditionBuilder condition={selectedWidget.visibleWhen} {vocab} label="Show this when" />
        </div>
        <p class="tip">Leave the condition empty for an always-on widget. Add one to show it only when state, an AI sense, a trait, item, or class matches — get in a car and a fuel gauge appears.</p>
      {:else}
        <p class="empty">Drop a primitive onto a slot, then select it to edit its label, representation, colour, and visibility.</p>
      {/if}
    </div>
  </div>
</div>

{#if picker}
  <div class="pickwrap" onclick={() => (picker = null)} role="presentation">
    <div class="pickcard" onclick={(e) => e.stopPropagation()} role="presentation">
      <h4>Add to {picker}</h4>
      <div class="picklist">
        {#each primitives as p}<button onclick={() => addWidget(picker, p)}>{p.name}<span>{p.kind === "action" ? "act" : p.type}</span></button>{/each}
      </div>
    </div>
  </div>
{/if}

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
  .blurb {
    color: var(--muted);
    font-size: 16.5px;
    max-width: 760px;
    margin-bottom: 16px;
  }
  .bar {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    align-items: center;
    margin-bottom: 16px;
  }
  .seg {
    display: inline-flex;
    gap: 2px;
    background: var(--bg-subtle);
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    padding: 3px;
  }
  .seg button {
    font-size: 15px;
    font-weight: 600;
    color: var(--muted);
    background: none;
    border: none;
    padding: 6px 12px;
    border-radius: 6px;
    cursor: pointer;
  }
  .seg button.cur {
    background: var(--bg);
    color: var(--accent);
  }
  .parity {
    font-size: 14px;
    color: var(--muted);
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .parity select {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--r-sm);
    color: var(--text);
    font: inherit;
    font-size: 14px;
    padding: 5px 7px;
  }

  .uib {
    display: grid;
    grid-template-columns: 272px 1fr 320px;
    gap: 18px;
    align-items: start;
  }
  .pal,
  .insp {
    background: var(--bg-subtle);
    border: 1px solid var(--border-subtle);
    border-radius: var(--r-lg);
    overflow: hidden;
  }
  .pal.dim .prim {
    opacity: 0.5;
  }
  .ph {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 13px 15px;
    border-bottom: 1px solid var(--border-subtle);
    background: var(--bg);
  }
  .ph h4 {
    font-size: 17.5px;
  }
  .tg {
    font-size: 12.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--muted);
  }
  .pbody {
    padding: 14px;
  }
  .palnote {
    font-size: 14.5px;
    color: var(--muted);
    margin-bottom: 12px;
    line-height: 1.5;
  }
  .prim {
    display: flex;
    align-items: center;
    gap: 10px;
    background: var(--bg);
    border: 1px solid var(--border-subtle);
    border-radius: var(--r-md);
    padding: 11px 13px;
    margin-bottom: 8px;
    cursor: grab;
  }
  .prim:hover {
    border-color: var(--accent);
  }
  .pn {
    flex: 1;
    min-width: 0;
    font-size: 16.5px;
    font-weight: 600;
    overflow-wrap: anywhere;
  }
  .gico {
    font-size: 16.5px;
    opacity: 0.8;
    flex-shrink: 0;
  }
  .ty {
    flex-shrink: 0;
    font-family: var(--font-mono);
    font-size: 13px;
    font-weight: 600;
    padding: 2px 7px;
    border-radius: 5px;
    border: 1px solid var(--border-code);
    background: var(--code);
    color: var(--accent);
  }

  .stage {
    position: relative;
  }
  .stage.phone {
    display: flex;
    justify-content: center;
  }
  .stage.unsupported .device {
    filter: grayscale(1) brightness(0.6);
    pointer-events: none;
  }
  .notprovided {
    background: color-mix(in srgb, var(--warning) 10%, transparent);
    border: 1px solid color-mix(in srgb, var(--warning) 35%, transparent);
    color: var(--warning);
    font-size: 14px;
    padding: 9px 12px;
    border-radius: var(--r-md);
    margin-bottom: 10px;
  }

  .device {
    background: #0e0e0e;
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    overflow: hidden;
  }
  /* mobile renders inside the bezel PNG: content shows through its transparent screen, the frame layers on top */
  .device.phone {
    position: relative;
    width: 320px;
    max-width: 100%;
    aspect-ratio: 346 / 692;
    background: #0c0c0c;
    border: none;
    border-radius: 54px;
    overflow: visible;
  }
  .device.phone .screen {
    position: absolute;
    top: 9%;
    left: 10.5%;
    right: 10.5%;
    bottom: 5.2%;
    overflow-y: auto;
    overflow-x: hidden;
    background: #0c0c0c;
    z-index: 1;
  }
  .device.phone .pc {
    width: 60px;
  }
  .device.phone .pcimg {
    height: 64px;
    font-size: 22px;
  }
  /* phone text reads a touch smaller than desktop, matching the live game's proportions */
  .device.phone .narr {
    font-size: 14.5px;
  }
  .device.phone .ab {
    font-size: 13.5px;
  }
  .device.phone .dvinput {
    font-size: 14px;
  }
  .device.phone .scenecap {
    font-size: 11.5px;
  }
  .device.phone .dvrow {
    font-size: 12.5px;
  }
  .device.phone .pcname {
    font-size: 11.5px;
  }
  .device.phone .mtabs {
    font-size: 12px;
  }
  .device.phone::after {
    content: "";
    position: absolute;
    inset: 0;
    background: url("/images/phone.png") center / 100% 100% no-repeat;
    pointer-events: none;
    z-index: 2;
  }
  .dvtop {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 11px 16px;
    border-bottom: 1px solid #1d1d1d;
    font-size: 14.5px;
    color: #9aa3ad;
  }
  .gp {
    display: flex;
    gap: 14px;
  }
  .dvrow {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 16px 4px;
    font-size: 14px;
    color: #7e8893;
  }
  .scenecap {
    padding: 5px 16px 0;
    font-size: 13px;
    color: #6b7480;
    letter-spacing: 0.02em;
  }
  .party {
    display: flex;
    gap: 8px;
    padding: 4px 13px 12px;
    overflow-x: auto;
  }
  .pc {
    width: 74px;
    flex-shrink: 0;
  }
  .pcimg {
    height: 80px;
    border-radius: 6px;
    border: 1px solid #2a2a2a;
    display: grid;
    place-items: center;
    color: #0d1117;
    font-weight: 800;
    font-size: 26px;
  }
  .pchp {
    height: 4px;
    border-radius: 3px;
    background: #2a2a2a;
    margin: -7px 4px 0;
    position: relative;
    z-index: 2;
  }
  .pchp > i {
    display: block;
    height: 100%;
    border-radius: 3px;
    background: var(--success);
  }
  .pcname {
    font-size: 12.5px;
    color: #c4ccd4;
    text-align: center;
    margin-top: 7px;
  }
  .hudbar {
    padding: 4px 16px;
  }
  .narr {
    padding: 12px 16px;
    font-size: 16.5px;
    color: #cdd3da;
    line-height: 1.6;
    border-top: 1px solid #1a1a1a;
  }
  .actbar {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 12px 16px;
    border-top: 1px solid #1a1a1a;
    flex-wrap: wrap;
  }
  .ab {
    font-size: 15.5px;
    color: #c4ccd4;
    background: #161616;
    border: 1px solid #2a2a2a;
    border-radius: 18px;
    padding: 7px 14px;
  }
  .dvinput {
    margin: 0 16px 16px;
    background: #161616;
    border: 1px solid #2a2a2a;
    border-radius: 22px;
    padding: 12px 17px;
    color: #6b7480;
    font-size: 16.5px;
  }
  .bottomnav {
    display: flex;
    justify-content: space-around;
    padding: 10px 0;
    border-top: 1px solid #1a1a1a;
    font-size: 19px;
  }
  .modal {
    padding: 10px 13px 16px;
  }
  .mtabs {
    display: flex;
    gap: 14px;
    font-size: 13.5px;
    color: #7e8893;
    border-bottom: 1px solid #1d1d1d;
    padding-bottom: 8px;
    margin-bottom: 10px;
  }
  .mtabs .cur {
    color: var(--accent);
    font-weight: 600;
  }

  .drop {
    outline: 1.5px dashed #3a4a63;
    outline-offset: 1px;
    border-radius: 6px;
    min-height: 30px;
    display: flex;
    gap: 6px;
    align-items: center;
    flex-wrap: wrap;
    padding: 5px 7px;
    transition: 0.12s;
  }
  .drop.empty {
    color: #5e7aa8;
  }
  .drop.body {
    min-height: 120px;
    align-items: flex-start;
    align-content: flex-start;
  }
  .dlabel {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.03em;
    text-transform: uppercase;
  }
  .placed {
    position: relative;
    background: #11202f;
    border: 1px solid #2f567f;
    border-radius: 5px;
    padding: 4px 7px;
    cursor: pointer;
    color: #cdd9e8;
    font-size: 13px;
  }
  .placed.sel {
    border-color: var(--accent);
    box-shadow: 0 0 0 2px var(--accent-soft);
  }
  .placed.hidden {
    opacity: 0.4;
    border-style: dashed;
  }
  .hideflag {
    position: absolute;
    top: -7px;
    left: -7px;
    background: var(--bg-subtle);
    border: 1px solid var(--border);
    border-radius: 50%;
    width: 16px;
    height: 16px;
    line-height: 14px;
    text-align: center;
    font-size: 11px;
    color: var(--warning);
  }
  .previewas {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    background: var(--bg-subtle);
    border: 1px solid var(--border-subtle);
    border-radius: var(--r-md);
    padding: 8px 11px;
    margin-bottom: 10px;
  }
  .pal-h {
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--muted);
  }
  .pa {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13.5px;
    color: var(--text);
  }
  .pa select,
  .pa .panum {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--r-sm);
    color: var(--text);
    font: inherit;
    font-size: 13px;
    padding: 3px 6px;
  }
  .pa .panum {
    width: 64px;
  }
  .pl-t {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: #9fb6d4;
    margin-bottom: 3px;
  }
  .pl-bar {
    display: block;
    height: 5px;
    border-radius: 3px;
    background: #22344a;
    overflow: hidden;
    width: 56px;
  }
  .pl-bar > i {
    display: block;
    height: 100%;
  }
  .icons {
    font-size: 14px;
    letter-spacing: 1px;
  }
  .pl-num {
    font-size: 13px;
  }
  .pl-pill {
    display: inline-block;
    border: 1px solid;
    border-radius: 18px;
    padding: 1px 8px;
    font-size: 13px;
  }
  .pl-btn {
    display: inline-block;
    border: 1px solid;
    border-radius: 18px;
    padding: 3px 10px;
    background: #161616;
  }
  .del {
    position: absolute;
    top: -7px;
    right: -7px;
    background: var(--bg-subtle);
    border: 1px solid var(--border);
    border-radius: 50%;
    width: 16px;
    height: 16px;
    line-height: 14px;
    text-align: center;
    font-size: 13px;
    color: var(--muted);
  }
  .del:hover {
    color: var(--error);
    border-color: var(--error);
  }

  .insp .ib {
    padding: 15px;
  }
  .insp .empty {
    color: var(--muted);
    font-size: 16px;
    line-height: 1.55;
    text-align: center;
    padding: 22px 8px;
  }
  .f {
    display: block;
    margin-bottom: 13px;
  }
  .f span {
    display: block;
    font-size: 14.5px;
    font-weight: 600;
    color: var(--muted);
    margin-bottom: 6px;
  }
  .f input,
  .f select {
    width: 100%;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--r-sm);
    padding: 9px 11px;
    color: var(--text);
    font: inherit;
    font-size: 16px;
    outline: none;
  }
  .f input:focus,
  .f select:focus {
    border-color: var(--accent);
  }
  .f .color {
    height: 32px;
    padding: 2px;
  }
  .tip {
    font-size: 13.5px;
    color: var(--muted);
    line-height: 1.5;
    margin-top: 6px;
  }

  .pickwrap {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.55);
    display: grid;
    place-items: end center;
    z-index: 50;
  }
  .pickcard {
    background: var(--bg-subtle);
    border: 1px solid var(--border);
    border-radius: var(--r-lg) var(--r-lg) 0 0;
    width: 100%;
    max-width: 420px;
    padding: 16px;
    max-height: 60vh;
    overflow-y: auto;
  }
  .pickcard h4 {
    font-size: 16.5px;
    margin-bottom: 12px;
  }
  .picklist {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .picklist button {
    display: flex;
    justify-content: space-between;
    background: var(--bg);
    border: 1px solid var(--border-subtle);
    border-radius: var(--r-md);
    padding: 10px 12px;
    color: var(--text);
    font: inherit;
    font-size: 16px;
    cursor: pointer;
  }
  .picklist button:hover {
    border-color: var(--accent);
  }
  .picklist span {
    font-family: var(--font-mono);
    font-size: 13px;
    color: var(--accent);
  }

  @container page (max-width: 780px) {
    .uib {
      grid-template-columns: 1fr;
    }
    .pal,
    .insp {
      order: 2;
    }
  }
</style>
