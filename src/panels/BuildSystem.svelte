<script>
  import { store, view, uid } from "../lib/store.svelte.js";
  import { vocabulary, evalCondition, emptyCondition } from "../lib/engine/conditions.js";
  import { applyEffects } from "../lib/engine/effects.js";
  import { tickStatuses, activeStatuses } from "../lib/engine/statuses.js";
  import { COMPONENT_TYPES, SENSE_TYPES, EVENT_CATALOG, eventSubject } from "../lib/engine/events.js";
  import HandlerEditor from "../components/HandlerEditor.svelte";

  const system = $derived(store.project.systems.find((s) => s.id === view.systemId));
  const mechanical = $derived(system?.components.filter((c) => !c.sensed) ?? []);
  const senses = $derived(system?.components.filter((c) => c.sensed) ?? []);
  const vocab = $derived(vocabulary(store.project));
  const targets = $derived(mechanical.map((c) => c.name));

  let sim = $state({});
  let lastTurn = $state(null);
  let fired = $state({ events: [], narrations: [], checkMod: 0, blocked: false });

  function initState() {
    const next = {};
    for (const c of system?.components ?? []) {
      if (c.sensed) next[c.name] = c.valueType === "enum" ? (c.options?.[0] ?? "") : false;
      else next[c.name] = c.default ?? (c.type === "bool" || c.type === "derived" ? false : 0);
    }
    next.__statuses = [];
    next.__quests = {};
    next.__revealed = [];
    next.__traits = [];
    next.__location = "";
    return next;
  }

  // re-seed the sandbox whenever the open system or its component set changes
  $effect(() => {
    void view.systemId;
    void system?.components.length;
    sim = initState();
    lastTurn = null;
    fired = { events: [], narrations: [], checkMod: 0, blocked: false };
  });

  function contextFrom(state) {
    const values = {};
    const flags = {};
    for (const c of system?.components ?? []) {
      if (c.sensed) flags[c.name] = state[c.name];
      else values[c.name] = state[c.name];
    }
    return {
      values,
      flags,
      skills: {},
      traits: new Set(state.__traits ?? []),
      items: new Set(),
      equipped: new Set(),
      class: "",
      location: state.__location ?? "",
      quests: state.__quests ?? {},
      revealed: new Set(state.__revealed ?? []),
    };
  }

  function clamp(state) {
    for (const c of mechanical) {
      if (typeof state[c.name] === "number") {
        if (c.min != null) state[c.name] = Math.max(c.min, state[c.name]);
        if (c.max != null) state[c.name] = Math.min(c.max, state[c.name]);
      }
    }
    return state;
  }

  function simulateTurn() {
    const previousContext = contextFrom(lastTurn ?? sim);
    let working = tickStatuses({ ...sim });
    const events = [];
    const narrations = [];
    let checkMod = 0;
    let blocked = false;
    for (const h of system.handlers.filter((h) => h.event === "onTurnStart" && h.mode !== "script")) {
      if (!evalCondition(h.when, contextFrom(working), previousContext)) continue;
      const result = applyEffects(h.effects, working);
      working = result.state;
      events.push(...result.emitted);
      narrations.push(...result.narrations);
      checkMod += result.checkMod;
      blocked = blocked || result.blocked;
    }
    sim = clamp(working);
    lastTurn = { ...sim };
    fired = { events, narrations, checkMod, blocked };
  }

  function resetSim() {
    sim = initState();
    lastTurn = null;
    fired = { events: [], narrations: [], checkMod: 0, blocked: false };
  }

  // One button per distinct (event, subject) the rules listen for, so the addressable events are firable live.
  const eventTriggers = $derived.by(() => {
    const seen = new Set();
    const out = [];
    for (const h of system?.handlers ?? []) {
      if (h.event === "onTurnStart" || h.mode === "script") continue;
      const key = `${h.event}|${h.subject ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const ev = EVENT_CATALOG.find((e) => e.id === h.event);
      out.push({ event: h.event, subject: h.subject ?? "", label: (ev?.label ?? h.event) + (h.subject ? `: ${h.subject}` : "") });
    }
    return out;
  });

  // An event fires its matching rules once, without advancing a turn — so a status applied here only decays on Simulate turn.
  function fireEvent(eventId, subject) {
    const previousContext = contextFrom(lastTurn ?? sim);
    let working = { ...sim };
    const events = [];
    const narrations = [];
    let checkMod = 0;
    let blocked = false;
    for (const h of system.handlers.filter((h) => h.event === eventId && h.mode !== "script")) {
      if (h.subject && subject && h.subject !== subject) continue;
      if (!evalCondition(h.when, contextFrom(working), previousContext)) continue;
      const result = applyEffects(h.effects, working);
      working = result.state;
      events.push(...result.emitted);
      narrations.push(...result.narrations);
      checkMod += result.checkMod;
      blocked = blocked || result.blocked;
    }
    working = applyDefaultOutcome(eventId, subject, working, blocked);
    sim = clamp(working);
    fired = { events, narrations, checkMod, blocked };
  }

  // A blocking rule must override the event's own outcome, so the move/reveal only lands when nothing vetoed it.
  function applyDefaultOutcome(eventId, subject, working, blocked) {
    if (blocked || !subject) return working;
    if (eventId === "onEnterLocation") return { ...working, __location: subject };
    if (eventId === "onMeetEntity") return { ...working, __revealed: [...new Set([...(working.__revealed ?? []), subject])] };
    if (eventId === "onQuestAccept") return { ...working, __quests: { ...(working.__quests ?? {}), [subject]: "active" } };
    if (eventId === "onQuestComplete") return { ...working, __quests: { ...(working.__quests ?? {}), [subject]: "completed" } };
    return working;
  }

  const checkMod = $derived.by(() => {
    if (!system) return 0;
    const context = contextFrom(sim);
    let mod = 0;
    for (const h of system.handlers.filter((h) => h.event === "onSkillCheck")) {
      if (evalCondition(h.when, context))
        mod += applyEffects(
          h.effects.filter((e) => e.kind === "check"),
          {},
        ).checkMod;
    }
    return mod;
  });

  // Hidden until a rule touches it, so simple systems aren't cluttered with empty orchestration state.
  const worldState = $derived.by(() => {
    const quests = Object.entries(sim.__quests ?? {});
    const revealed = sim.__revealed ?? [];
    const traits = sim.__traits ?? [];
    const location = sim.__location ?? "";
    const has = location || quests.length || revealed.length || traits.length;
    return { quests, revealed, traits, location, has };
  });

  function numeric(c) {
    return c.type === "int" || c.type === "float";
  }

  function pct(c) {
    const min = c.min ?? 0;
    const max = c.max ?? 100;
    return Math.max(0, Math.min(100, (((sim[c.name] ?? 0) - min) / (max - min || 1)) * 100));
  }

  function bump(c, delta) {
    sim = clamp({ ...sim, [c.name]: (sim[c.name] ?? 0) + delta });
  }

  function setVal(name, value) {
    sim = clamp({ ...sim, [name]: value });
  }

  function addComponent() {
    system.components.push({ id: uid("c"), name: "newValue", type: "int", min: 0, max: 100, default: 0, note: "" });
  }

  function addSense() {
    system.components.push({ id: uid("c"), name: "sensedFlag", sensed: true, valueType: "bool", options: [], instruction: "" });
  }

  function removeComponent(id) {
    const index = system.components.findIndex((c) => c.id === id);
    if (index >= 0) system.components.splice(index, 1);
  }

  function addHandler() {
    system.handlers.push({ id: uid("h"), event: "onTurnStart", when: emptyCondition(), effects: [] });
  }

  function removeHandler(id) {
    const index = system.handlers.findIndex((h) => h.id === id);
    if (index >= 0) system.handlers.splice(index, 1);
  }

  function setOptions(component, text) {
    component.options = text
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
</script>

{#if system}
  <div class="crumb"><button onclick={() => (view.section = "systems")}>Game Systems</button> → <b>{system.name}</b></div>
  <div class="titlerow">
    <input class="title" bind:value={system.name} aria-label="System name" />
    <input class="desc" bind:value={system.description} placeholder="One line on what this system does" />
  </div>

  <div class="builder">
    <div class="defs">
      <section class="panel">
        <div class="ph">
          <h4><span class="dot"></span>Components</h4>
          <span class="tg">mechanical</span>
        </div>
        <div class="pb">
          <p class="hint">Typed state the engine tracks and the math runs on. No AI touches these — they are exact, every turn.</p>
          {#each mechanical as c (c.id)}
            <div class="comp">
              <input class="cname" bind:value={c.name} aria-label="Component name" />
              <select class="ctype" bind:value={c.type} aria-label="Component type">
                {#each COMPONENT_TYPES as t}<option value={t.id}>{t.id}</option>{/each}
              </select>
              {#if numeric(c)}
                <input class="cnum" type="number" bind:value={c.min} title="min" />
                <input class="cnum" type="number" bind:value={c.max} title="max" />
                <input class="cnum" type="number" bind:value={c.default} title="default" />
              {/if}
              <button class="rx" onclick={() => removeComponent(c.id)} aria-label="Remove">×</button>
            </div>
          {/each}
          <button class="addrow" onclick={addComponent}>＋ Add component</button>
        </div>
      </section>

      <section class="panel">
        <div class="ph ai">
          <h4><span class="dot ai"></span>AI senses</h4>
          <span class="tg">narrator</span>
        </div>
        <div class="pb">
          <p class="hint">
            The exception: things the engine can't know from state. The narrator reads the story and sets each one — a yes/no or one of a few words. Keep them few and concrete; everything else stays
            mechanical.
          </p>
          {#each senses as c (c.id)}
            <div class="sense">
              <div class="senserow">
                <input class="cname" bind:value={c.name} aria-label="AI sense name" />
                <select class="ctype" bind:value={c.valueType} aria-label="AI sense value type">
                  {#each SENSE_TYPES as t}<option value={t.id}>{t.label}</option>{/each}
                </select>
                <button class="rx" onclick={() => removeComponent(c.id)} aria-label="Remove">×</button>
              </div>
              {#if c.valueType === "enum"}
                <input class="opts" value={(c.options ?? []).join(", ")} onchange={(e) => setOptions(c, e.target.value)} placeholder="idle, walking, running, sprinting" />
              {/if}
              <textarea
                class="instr"
                bind:value={c.instruction}
                rows="2"
                placeholder="Tell the narrator exactly when this is true, e.g. “true while the player is actively driving or riding the vehicle.”"></textarea>
            </div>
          {/each}
          <button class="addrow ai" onclick={addSense}>＋ Add an AI sense</button>
        </div>
      </section>
    </div>

    <section class="panel">
      <div class="ph">
        <h4><span class="dot"></span>Rules</h4>
        <span class="tg">events</span>
      </div>
      <div class="pb">
        <p class="hint">
          On an engine event, when a condition holds, change state. Conditions read components, AI senses, traits, skills, items and more. The same condition language drives the UI Builder.
        </p>
        {#each system.handlers as h (h.id)}
          <HandlerEditor handler={h} {vocab} {targets} onremove={() => removeHandler(h.id)} />
        {/each}
        <button class="addrow" onclick={addHandler}>＋ Add rule</button>
      </div>
    </section>

    <section class="panel">
      <div class="ph">
        <h4><span class="dot"></span>Live Preview</h4>
        <span class="tg">simulate</span>
      </div>
      <div class="pb">
        <span class="vtag">● Engine-validated · deterministic</span>

        <div class="gauges">
          {#each mechanical.filter(numeric) as c (c.id)}
            <div class="widget">
              <div class="wt"><span>{c.name}</span><span class="num">{sim[c.name]} {c.max != null ? `/ ${c.max}` : ""}</span></div>
              <div class="gauge"><i style="width:{pct(c)}%;background:{pct(c) <= 20 ? 'var(--error)' : 'var(--accent)'}"></i></div>
              <div class="step"><button onclick={() => bump(c, -1)}>−</button><button onclick={() => bump(c, 1)}>＋</button></div>
            </div>
          {/each}
        </div>
        {#each mechanical.filter((c) => c.type === "bool" || c.type === "derived") as c (c.id)}
          <label class="flag"><input type="checkbox" checked={!!sim[c.name]} onchange={(e) => setVal(c.name, e.target.checked)} /> {c.name}</label>
        {/each}

        {#if senses.length}
          <div class="sensesim">
            <span class="ssh">Narrator says this turn</span>
            {#each senses as c (c.id)}
              {#if c.valueType === "enum"}
                <label class="ssrow"
                  >{c.name}
                  <select value={sim[c.name]} onchange={(e) => setVal(c.name, e.target.value)}>
                    {#each c.options ?? [] as opt}<option value={opt}>{opt}</option>{/each}
                  </select>
                </label>
              {:else}
                <label class="ssrow check"><input type="checkbox" checked={!!sim[c.name]} onchange={(e) => setVal(c.name, e.target.checked)} /> {c.name}</label>
              {/if}
            {/each}
          </div>
        {/if}

        {#if activeStatuses(sim).length}
          <div class="statuses">
            <span class="ssh">Active statuses</span>
            {#each activeStatuses(sim) as s (s.id)}
              <div class="strow">
                <b>{s.label}</b>
                {#if s.group}<span class="sgrp">{s.group}</span>{/if}
                <span class="sdur">{s.remaining == null ? "until cleared" : `${s.remaining} turn${s.remaining === 1 ? "" : "s"} left`}</span>
                {#if s.target}<span class="smod">{s.target} +{s.amount}</span>{/if}
                <span class="sscope">{s.scope}</span>
              </div>
            {/each}
          </div>
        {/if}

        {#if worldState.has}
          <div class="worldstate">
            <span class="ssh">World state</span>
            {#if worldState.location}<div class="wsrow"><span class="wsk">location</span> <b>{worldState.location}</b></div>{/if}
            {#each worldState.quests as [name, status]}
              <div class="wsrow"><span class="wsk">quest</span> <b>{name}</b> <span class="wsv {status}">{status === "notStarted" ? "not started" : status}</span></div>
            {/each}
            {#if worldState.revealed.length}<div class="wsrow">
                <span class="wsk">met</span>
                {#each worldState.revealed as e}<span class="chip">{e}</span>{/each}
              </div>{/if}
            {#if worldState.traits.length}<div class="wsrow">
                <span class="wsk">traits</span>
                {#each worldState.traits as t}<span class="chip">{t}</span>{/each}
              </div>{/if}
          </div>
        {/if}

        {#if eventTriggers.length}
          <div class="triggers">
            <span class="ssh">Trigger an event</span>
            <div class="trigbtns">
              {#each eventTriggers as t}
                <button class="trig" onclick={() => fireEvent(t.event, t.subject)}>▸ {t.label}</button>
              {/each}
            </div>
          </div>
        {/if}

        <div class="simrow">
          <button class="prim" onclick={simulateTurn}>▶ Simulate turn</button>
          <button class="ghost" onclick={resetSim}>↺ Reset</button>
        </div>
        {#if fired.blocked}<div class="toast blocked">⛔ Action blocked — a rule vetoed it, so the engine refused the move and the state did not change.</div>{/if}
        {#if checkMod !== 0}<div class="toast">⚠ Skill checks currently <b>{checkMod > 0 ? "+" : ""}{checkMod}</b> from this system</div>{/if}
        {#if fired.events.length}<div class="events">
            Events: {#each fired.events as e}<span>{e}</span>{/each}
          </div>{/if}
        {#each fired.narrations as n}<div class="narr">“{n}”</div>{/each}
        {#if !system.components.length}<p class="hint">Add a component or an AI sense to simulate here.</p>{/if}
      </div>
    </section>
  </div>

  {#if senses.length}
    <section class="aitask">
      <div class="ph">
        <h4><span class="dot ai"></span>Per-turn AI task</h4>
        <span class="tg">compiled</span>
      </div>
      <div class="pb">
        <p class="hint">
          This compiles to one structured tool call each turn: the narrator reads the story and returns typed values, which feed your deterministic rules. It is the entire job the AI is given here.
        </p>
        <div class="task">
          <div class="sig"><span class="fn">senseState</span>(narrative) → {"{"}</div>
          {#each senses as c (c.id)}
            <div class="trow"><code>{c.name}</code><span class="tt">: {c.valueType === "enum" ? (c.options ?? []).map((o) => `"${o}"`).join(" | ") : "true | false"}</span></div>
            <div class="ti">{c.instruction || "— no instruction yet —"}</div>
          {/each}
          <div class="sig">{"}"}</div>
        </div>
      </div>
    </section>
  {/if}
{:else}
  <p class="hint">System not found. <button class="link" onclick={() => (view.section = "systems")}>Back to library</button></p>
{/if}

<style>
  .crumb {
    font-size: 15.5px;
    color: var(--muted);
    margin-bottom: 12px;
  }
  .crumb b {
    color: var(--text);
  }
  .crumb button {
    background: none;
    border: none;
    color: var(--muted);
    cursor: pointer;
    font: inherit;
  }
  .crumb button:hover {
    color: var(--accent);
  }
  .titlerow {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 18px;
  }
  .title {
    font-size: 26px;
    font-weight: 700;
    background: none;
    border: none;
    color: var(--heading);
    outline: none;
  }
  .desc {
    font-size: 16.5px;
    background: none;
    border: none;
    color: var(--muted);
    outline: none;
  }
  .builder {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  /* φ split: the wider mechanical panel reads as primary, the narrower narrator panel as the exception. */
  .defs {
    display: grid;
    grid-template-columns: 1.618fr 1fr;
    gap: 14px;
    align-items: start;
  }
  .panel {
    background: var(--bg-subtle);
    border: 1px solid var(--border-subtle);
    border-radius: var(--r-lg);
    box-shadow: var(--shadow-card);
    overflow: hidden;
  }
  .ph {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 14px;
    border-bottom: 1px solid var(--border-subtle);
    background: var(--bg);
  }
  .ph.ai {
    border-top: 1px solid var(--border-subtle);
    background: var(--accent-soft);
  }
  .ph h4 {
    font-size: 16px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--accent);
  }
  .dot.ai {
    background: var(--warning);
  }
  .tg {
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--muted);
  }
  .pb {
    padding: 14px;
  }
  .hint {
    font-size: 14px;
    color: var(--muted);
    margin-bottom: 12px;
    line-height: 1.5;
  }
  .comp {
    display: flex;
    align-items: center;
    gap: 5px;
    margin-bottom: 7px;
    flex-wrap: wrap;
  }
  .cname {
    flex: 1;
    min-width: 60px;
    background: var(--bg);
    border: 1px solid var(--border-subtle);
    border-radius: var(--r-sm);
    color: var(--text);
    font: inherit;
    font-size: 15.5px;
    font-weight: 600;
    padding: 6px 8px;
  }
  .ctype {
    background: var(--code);
    border: 1px solid var(--border-code);
    border-radius: 5px;
    color: var(--accent);
    font-family: var(--font-mono);
    font-size: 13px;
    padding: 5px;
  }
  .cnum {
    width: 50px;
    background: var(--bg);
    border: 1px solid var(--border-subtle);
    border-radius: var(--r-sm);
    color: var(--muted);
    font: inherit;
    font-size: 13.5px;
    padding: 5px 6px;
    appearance: textfield;
    -moz-appearance: textfield;
  }
  .cnum::-webkit-outer-spin-button,
  .cnum::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  .rx {
    background: none;
    border: none;
    color: var(--muted);
    cursor: pointer;
    font-size: 16.5px;
  }
  .rx:hover {
    color: var(--error);
  }
  .sense {
    border: 1px solid color-mix(in srgb, var(--warning) 30%, transparent);
    border-radius: var(--r-md);
    padding: 8px;
    margin-bottom: 8px;
    background: color-mix(in srgb, var(--warning) 6%, transparent);
  }
  .senserow {
    display: flex;
    align-items: center;
    gap: 5px;
    margin-bottom: 6px;
  }
  .opts {
    width: 100%;
    background: var(--bg);
    border: 1px solid var(--border-subtle);
    border-radius: var(--r-sm);
    color: var(--text);
    font: inherit;
    font-size: 14px;
    padding: 6px 8px;
    margin-bottom: 6px;
  }
  .instr {
    width: 100%;
    background: var(--bg);
    border: 1px solid var(--border-subtle);
    border-radius: var(--r-sm);
    color: var(--text);
    font: inherit;
    font-size: 14px;
    line-height: 1.5;
    padding: 7px 8px;
    resize: vertical;
    outline: none;
  }
  .instr:focus {
    border-color: var(--warning);
  }
  .addrow {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    width: 100%;
    font-size: 15px;
    font-weight: 600;
    color: var(--accent);
    border: 1px dashed var(--border);
    border-radius: var(--r-md);
    padding: 8px;
    cursor: pointer;
    background: none;
    margin-top: 4px;
  }
  .addrow:hover {
    background: var(--accent-soft);
    border-color: var(--accent);
  }
  .addrow.ai {
    color: var(--warning);
  }
  .addrow.ai:hover {
    background: color-mix(in srgb, var(--warning) 12%, transparent);
    border-color: var(--warning);
  }
  .vtag {
    display: inline-flex;
    gap: 6px;
    align-items: center;
    font-size: 12.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--success);
    background: color-mix(in srgb, var(--success) 13%, transparent);
    padding: 4px 9px;
    border-radius: 20px;
    margin-bottom: 12px;
  }
  .gauges {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
    gap: 8px;
    margin-bottom: 8px;
  }
  .widget {
    background: var(--bg);
    border: 1px solid var(--border-subtle);
    border-radius: var(--r-md);
    padding: 10px 11px;
  }
  .wt {
    display: flex;
    justify-content: space-between;
    font-size: 15px;
    font-weight: 650;
    margin-bottom: 7px;
  }
  .num {
    color: var(--muted);
  }
  .gauge {
    height: 10px;
    border-radius: 6px;
    background: var(--border);
    overflow: hidden;
  }
  .gauge > i {
    display: block;
    height: 100%;
    border-radius: 6px;
    transition: width 0.4s cubic-bezier(0.4, 1.2, 0.5, 1);
  }
  .step {
    display: flex;
    gap: 6px;
    margin-top: 8px;
  }
  .step button {
    flex: 1;
    background: var(--bg-subtle);
    border: 1px solid var(--border);
    border-radius: var(--r-sm);
    color: var(--text);
    font-size: 16px;
    padding: 2px;
    cursor: pointer;
  }
  .step button:hover {
    border-color: var(--accent);
    color: var(--accent);
  }
  .flag {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 14px;
    color: var(--muted);
    padding: 5px 0;
  }
  .sensesim {
    border: 1px solid color-mix(in srgb, var(--warning) 30%, transparent);
    border-radius: var(--r-md);
    padding: 9px 11px;
    margin: 6px 0 10px;
    background: color-mix(in srgb, var(--warning) 6%, transparent);
  }
  .ssh {
    display: block;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--warning);
    margin-bottom: 6px;
  }
  .ssrow {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 14px;
    color: var(--text);
    padding: 3px 0;
  }
  .ssrow select {
    margin-left: auto;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--r-sm);
    color: var(--text);
    font: inherit;
    font-size: 13.5px;
    padding: 3px 6px;
  }
  .statuses {
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    padding: 9px 11px;
    margin: 6px 0 10px;
    background: var(--bg);
  }
  .strow {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    padding: 4px 0;
    flex-wrap: wrap;
  }
  .strow b {
    color: var(--heading);
  }
  .sgrp {
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--accent);
    background: var(--accent-soft);
    padding: 1px 7px;
    border-radius: 20px;
  }
  .sdur {
    color: var(--warning);
    font-weight: 600;
  }
  .smod {
    font-family: var(--font-mono);
    font-size: 13px;
    color: var(--muted);
  }
  .sscope {
    margin-left: auto;
    font-size: 12px;
    color: var(--muted);
  }
  .worldstate {
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    padding: 9px 11px;
    margin: 6px 0 10px;
    background: var(--bg);
  }
  .wsrow {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 14px;
    padding: 3px 0;
    flex-wrap: wrap;
  }
  .wsrow b {
    color: var(--heading);
  }
  .wsk {
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--muted);
    min-width: 62px;
  }
  .wsv {
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 1px 7px;
    border-radius: 20px;
  }
  .wsv.active {
    color: var(--warning);
    background: color-mix(in srgb, var(--warning) 14%, transparent);
  }
  .wsv.completed {
    color: var(--success);
    background: color-mix(in srgb, var(--success) 14%, transparent);
  }
  .wsv.notStarted {
    color: var(--muted);
    background: var(--bg-subtle);
  }
  .chip {
    font-size: 12.5px;
    font-weight: 600;
    color: var(--accent);
    background: var(--accent-soft);
    padding: 1px 8px;
    border-radius: 20px;
  }
  .toast.blocked {
    background: color-mix(in srgb, var(--error) 12%, transparent);
    border-color: color-mix(in srgb, var(--error) 38%, transparent);
    color: var(--error);
  }
  .triggers {
    margin: 6px 0 10px;
  }
  .trigbtns {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    margin-top: 6px;
  }
  .trig {
    font-size: 13.5px;
    font-weight: 600;
    color: var(--warning);
    background: color-mix(in srgb, var(--warning) 10%, transparent);
    border: 1px solid color-mix(in srgb, var(--warning) 35%, transparent);
    border-radius: var(--r-md);
    padding: 6px 10px;
    cursor: pointer;
  }
  .trig:hover {
    background: color-mix(in srgb, var(--warning) 18%, transparent);
  }
  .simrow {
    display: flex;
    gap: 8px;
    margin-top: 8px;
  }
  .prim {
    flex: 1;
    justify-content: center;
    background: var(--accent);
    color: var(--on-link);
    border: none;
    border-radius: var(--r-md);
    font-size: 15.5px;
    font-weight: 600;
    padding: 9px;
    cursor: pointer;
  }
  .ghost {
    background: var(--bg);
    border: 1px solid var(--border);
    color: var(--text);
    border-radius: var(--r-md);
    padding: 9px 12px;
    cursor: pointer;
    font-size: 15.5px;
  }
  .toast {
    margin-top: 11px;
    background: color-mix(in srgb, var(--warning) 12%, transparent);
    border: 1px solid color-mix(in srgb, var(--warning) 38%, transparent);
    color: var(--warning);
    border-radius: var(--r-md);
    padding: 9px 12px;
    font-size: 14px;
  }
  .toast b {
    color: var(--heading);
  }
  .events {
    margin-top: 10px;
    font-size: 13.5px;
    color: var(--muted);
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    align-items: center;
  }
  .events span {
    background: var(--accent-soft);
    color: var(--accent);
    border-radius: 20px;
    padding: 2px 9px;
    font-weight: 600;
  }
  .narr {
    margin-top: 8px;
    font-size: 14px;
    color: var(--text);
    font-style: italic;
    border-left: 2px solid var(--warning);
    padding: 4px 10px;
    background: color-mix(in srgb, var(--warning) 6%, transparent);
    border-radius: 0 var(--r-sm) var(--r-sm) 0;
  }
  .link {
    background: none;
    border: none;
    color: var(--accent);
    cursor: pointer;
    font: inherit;
  }
  .aitask {
    margin-top: 14px;
    background: var(--bg-subtle);
    border: 1px solid var(--border-subtle);
    border-radius: var(--r-lg);
    box-shadow: var(--shadow-card);
    overflow: hidden;
  }
  .task {
    background: var(--bg);
    border: 1px solid var(--border-subtle);
    border-radius: var(--r-md);
    padding: 12px;
  }
  .sig {
    font-family: var(--font-mono);
    font-size: 14px;
    color: var(--muted);
  }
  .sig .fn {
    color: var(--warning);
  }
  .trow {
    display: flex;
    align-items: baseline;
    gap: 4px;
    padding: 8px 0 2px 16px;
    flex-wrap: wrap;
  }
  .trow code {
    font-family: var(--font-mono);
    color: var(--warning);
    font-size: 14px;
  }
  .tt {
    font-family: var(--font-mono);
    font-size: 13px;
    color: var(--accent);
  }
  .ti {
    padding: 0 0 4px 16px;
    font-size: 13.5px;
    color: var(--muted);
    font-style: italic;
  }
  @container page (max-width: 720px) {
    .defs {
      grid-template-columns: 1fr;
    }
  }
</style>
