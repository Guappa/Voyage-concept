<script>
  import { store } from "../lib/store.svelte.js";
  import { indexTriggers, neighborhood, kindLabel, typeLabel, refKey, triggerVocab, emptyTrigger, slugifyName } from "../lib/engine/triggers.js";
  import TriggerEditor from "../components/TriggerEditor.svelte";
  import LazyCodeEditor from "../components/LazyCodeEditor.svelte";

  const index = $derived(indexTriggers(store.project));
  const vocab = $derived(triggerVocab(store.project));

  let editing = $state(null);
  let scriptOpen = $state(new Set());

  function openNew() {
    editing = { key: null, draft: { ...emptyTrigger(), __isNew: true } };
  }
  function openEdit(id) {
    editing = { key: id, draft: structuredClone(index.byId.get(id).raw) };
  }
  function saveTrigger(draft) {
    const clean = { ...draft };
    delete clean.__isNew;
    if (!clean.script) delete clean.script;
    let key = slugifyName(clean.name);
    const triggers = { ...(store.project.triggers ?? {}) };
    if (editing.key && editing.key !== key) delete triggers[editing.key];
    if (!editing.key) {
      let unique = key,
        n = 2;
      while (triggers[unique]) unique = `${key}_${n++}`;
      key = unique;
    }
    clean.name = key;
    triggers[key] = clean;
    store.project.triggers = triggers;
    editing = null;
  }
  function deleteTrigger(id) {
    if (!confirm(`Delete trigger “${id}”?`)) return;
    const triggers = { ...(store.project.triggers ?? {}) };
    delete triggers[id];
    store.project.triggers = triggers;
  }

  let search = $state("");
  let groupBy = $state("entity");
  let condFilter = $state("");
  let effectFilter = $state("");
  let onlyRecurring = $state(false);
  let onlyScripted = $state(false);
  let onlyFlagged = $state(false);
  let focusKey = $state("");
  let expanded = $state(new Set());
  let openGroups = $state(new Set());

  const PAGE_SIZE = 25;
  let page = $state(0);

  const KIND_ICON = { location: "📍", region: "🗺️", realm: "🌐", area: "🚪", trait: "🧩", var: "🔑" };

  function toggle(set, key) {
    const next = new Set(set);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  }

  const filtered = $derived.by(() => {
    const query = search.trim().toLowerCase();
    return index.triggers.filter((t) => {
      if (condFilter && !t.condTypes.includes(condFilter)) return false;
      if (effectFilter && !t.effectTypes.includes(effectFilter)) return false;
      if (onlyRecurring && !t.recurring) return false;
      if (onlyScripted && !t.hasScript) return false;
      if (onlyFlagged && !t.lint.some((l) => l.level === "warn")) return false;
      if (!query) return true;
      return t.name.toLowerCase().includes(query) || t.whenLines.some((l) => l.toLowerCase().includes(query)) || t.thenLines.some((l) => l.toLowerCase().includes(query));
    });
  });

  const filteredIds = $derived(new Set(filtered.map((t) => t.id)));

  // Group views key off the prebuilt index but intersect with the active filter so search narrows every layout.
  const groups = $derived.by(() => {
    if (groupBy === "none") return null;
    if (groupBy === "entity") {
      return index.entities.map((e) => ({ key: refKey(e.ref), label: e.ref.name, kind: e.ref.kind, items: e.triggerIds.filter((id) => filteredIds.has(id)) })).filter((g) => g.items.length);
    }
    const facet = groupBy === "cond" ? index.condTypes : index.effectTypes;
    const member = (t) => (groupBy === "cond" ? t.condTypes : t.effectTypes);
    return facet.map(([type]) => ({ key: type, label: typeLabel(type), kind: "type", items: filtered.filter((t) => member(t).includes(type)).map((t) => t.id) })).filter((g) => g.items.length);
  });

  const pageTotal = $derived(groupBy === "none" ? filtered.length : (groups?.length ?? 0));
  const pageCount = $derived(Math.max(1, Math.ceil(pageTotal / PAGE_SIZE)));
  // any change to the active filter or layout resets paging so the user never lands on an empty page
  $effect(() => {
    void search;
    void condFilter;
    void effectFilter;
    void onlyRecurring;
    void onlyScripted;
    void onlyFlagged;
    void groupBy;
    page = 0;
  });

  const focus = $derived(focusKey ? neighborhood(index, focusKey) : null);

  // Star layout only: hub in the centre, one spoke per attached trigger — never trigger-to-trigger edges, which are what turn a whole-world map into a hairball.
  const HUB = { x: 330, y: 175 };
  function nodePos(i, n) {
    const angle = (i / Math.max(n, 1)) * Math.PI * 2 - Math.PI / 2;
    return { x: HUB.x + Math.cos(angle) * 128, y: HUB.y + Math.sin(angle) * 118 };
  }
  function shortName(name) {
    return name.length > 18 ? `${name.slice(0, 17)}…` : name;
  }

  // A single spoke jumps to its card; a cluster filters the list to its prefix so the dozens behind it become browsable.
  function nodeClick(node) {
    if (node.single) {
      expanded = new Set([node.single.id]);
      document.getElementById(`t_${node.single.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    } else if (node.prefix) {
      search = node.prefix;
    }
  }

  function trig(id) {
    return index.byId.get(id);
  }

  function clearFilters() {
    search = "";
    condFilter = "";
    effectFilter = "";
    onlyRecurring = false;
    onlyScripted = false;
    onlyFlagged = false;
  }
</script>

<div class="head">
  <div class="headrow">
    <h2>Events</h2>
    <button class="new" onclick={openNew}>＋ New event</button>
  </div>
  <p class="sub">Every trigger in this world, read as plain language. Built to audit what an AI wrote, not to scroll JSON. Search, filter, or focus one entity to see only what touches it.</p>
</div>

{#if index.stats.total === 0}
  <div class="empty">
    <p>This world has no triggers yet.</p>
    <p class="hint">Triggers are world orchestration: start a quest, gate a location, reveal a character. Import the example world to see hundreds at work.</p>
    <button class="new" onclick={openNew}>＋ New event</button>
  </div>
{:else}
  <div class="stats">
    <div class="stat"><b>{index.stats.total}</b><span>triggers</span></div>
    <div class="stat"><b>{index.stats.recurring}</b><span>every turn</span></div>
    <div class="stat"><b>{index.stats.total - index.stats.recurring}</b><span>one-shot</span></div>
    <div class="stat"><b>{index.stats.scripted}</b><span>use a script</span></div>
    <div class="stat warn" class:on={onlyFlagged}><b>{index.stats.flagged}</b><span>flagged</span></div>
  </div>

  <div class="toolbar">
    <input class="tsearch" placeholder="Search triggers, conditions, effects…" bind:value={search} />
    <div class="seg">
      <span class="seglabel">group by</span>
      <button class:cur={groupBy === "entity"} onclick={() => (groupBy = "entity")}>entity</button>
      <button class:cur={groupBy === "cond"} onclick={() => (groupBy = "cond")}>condition</button>
      <button class:cur={groupBy === "effect"} onclick={() => (groupBy = "effect")}>effect</button>
      <button class:cur={groupBy === "none"} onclick={() => (groupBy = "none")}>flat</button>
    </div>
  </div>

  <div class="facets">
    <select bind:value={condFilter} aria-label="Filter by condition type">
      <option value="">any condition</option>
      {#each index.condTypes as [type, n]}<option value={type}>{typeLabel(type)} ({n})</option>{/each}
    </select>
    <select bind:value={effectFilter} aria-label="Filter by effect type">
      <option value="">any effect</option>
      {#each index.effectTypes as [type, n]}<option value={type}>{typeLabel(type)} ({n})</option>{/each}
    </select>
    <button class="chip" class:on={onlyRecurring} onclick={() => (onlyRecurring = !onlyRecurring)}>every turn</button>
    <button class="chip" class:on={onlyScripted} onclick={() => (onlyScripted = !onlyScripted)}>scripted</button>
    <button class="chip" class:on={onlyFlagged} onclick={() => (onlyFlagged = !onlyFlagged)}>flagged</button>
    <span class="count">{filtered.length} shown</span>
    {#if search || condFilter || effectFilter || onlyRecurring || onlyScripted || onlyFlagged}
      <button class="clear" onclick={clearFilters}>clear</button>
    {/if}
  </div>

  {#if focus}
    <section class="graph">
      <div class="gh">
        <span
          >Focused on <b>{KIND_ICON[focus.hub.kind]} {focus.hub.name}</b> · {focus.total} trigger{focus.total === 1 ? "" : "s"}{focus.nodes.length < focus.total
            ? ` grouped into ${focus.nodes.length}`
            : ""}</span
        >
        <button class="closeg" onclick={() => (focusKey = "")}>close ✕</button>
      </div>
      <svg viewBox="0 0 660 350" class="svg" role="img" aria-label="Triggers connected to {focus.hub.name}">
        {#each focus.nodes as n, i}
          {@const p = nodePos(i, focus.nodes.length)}
          <line x1={HUB.x} y1={HUB.y} x2={p.x} y2={p.y} class="edge" />
        {/each}
        {#each focus.nodes as n, i}
          {@const p = nodePos(i, focus.nodes.length)}
          <g class="tnode" onclick={() => nodeClick(n)} onkeydown={(e) => (e.key === "Enter" || e.key === " ") && nodeClick(n)} role="button" tabindex="0">
            <circle cx={p.x} cy={p.y} r={n.single ? 6 : Math.min(15, 7 + n.count / 5)} class:flagged={n.single?.lint?.some((l) => l.level === "warn")} class:cluster={!n.single} />
            {#if !n.single}<text x={p.x} y={p.y + 3.5} text-anchor="middle" class="cnum">{n.count}</text>{/if}
            <text x={p.x} y={p.y - 13} text-anchor="middle">{n.single ? shortName(n.label) : n.label}</text>
          </g>
        {/each}
        <circle cx={HUB.x} cy={HUB.y} r="13" class="hub" />
        <text x={HUB.x} y={HUB.y + 30} text-anchor="middle" class="hublabel">{KIND_ICON[focus.hub.kind]} {shortName(focus.hub.name)}</text>
      </svg>
      {#if focus.others.length}
        <div class="hop">
          <span class="hoplabel">also linked through these triggers:</span>
          {#each focus.others.slice(0, 14) as o}
            <button class="echip" onclick={() => (focusKey = refKey(o.ref))}>{KIND_ICON[o.ref.kind]} {o.ref.name} <i>{o.count}</i></button>
          {/each}
        </div>
      {/if}
    </section>
  {/if}

  {#if groupBy === "none"}
    <div class="list">
      {#each filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE) as t (t.id)}
        {@render card(t)}
      {/each}
      {#if !filtered.length}<p class="hint">No triggers match.</p>{/if}
    </div>
  {:else}
    <div class="grouplist">
      {#each groups.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE) as g (g.key)}
        {@const warnCount = g.items.filter((id) => trig(id).lint.some((l) => l.level === "warn")).length}
        <div class="group">
          <button class="grouphead" onclick={() => (openGroups = toggle(openGroups, g.key))}>
            <span class="caret">{openGroups.has(g.key) ? "▾" : "▸"}</span>
            <span class="gname">{g.kind === "type" ? "" : (KIND_ICON[g.kind] ?? "") + " "}{g.label}</span>
            {#if g.kind !== "type"}<span class="gkind">{kindLabel(g.kind)}</span>{/if}
            <span class="gcount">{g.items.length}</span>
            {#if warnCount}<span class="gwarn">⚠ {warnCount}</span>{/if}
            {#if g.kind !== "type"}<span
                class="gfocus"
                role="button"
                tabindex="0"
                onclick={(e) => {
                  e.stopPropagation();
                  focusKey = g.key;
                }}
                onkeydown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.stopPropagation();
                    focusKey = g.key;
                  }
                }}>focus ◎</span
              >{/if}
          </button>
          {#if openGroups.has(g.key)}
            <div class="groupbody">
              {#each g.items as id (id)}
                {@render card(trig(id))}
              {/each}
            </div>
          {/if}
        </div>
      {/each}
      {#if !groups.length}<p class="hint">No triggers match.</p>{/if}
    </div>
  {/if}

  {#if pageCount > 1}
    <div class="pager">
      <button onclick={() => (page = Math.max(0, page - 1))} disabled={page === 0} aria-label="Previous page">‹</button>
      <span>{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, pageTotal)} of {pageTotal} {groupBy === "none" ? "events" : "groups"}</span>
      <button onclick={() => (page = Math.min(pageCount - 1, page + 1))} disabled={page >= pageCount - 1} aria-label="Next page">›</button>
    </div>
  {/if}
{/if}

{#if editing}
  <TriggerEditor draft={editing.draft} {vocab} onsave={saveTrigger} oncancel={() => (editing = null)} />
{/if}

{#snippet card(t)}
  <article class="tc" id="t_{t.id}">
    <div class="tch">
      <b class="tname">{t.name}</b>
      <span class="tbadge {t.recurring ? 'rec' : 'once'}">{t.recurring ? "every turn" : "once"}</span>
      {#if t.hasScript}<span class="tbadge script">script</span>{/if}
      {#if t.lint.some((l) => l.level === "warn")}<span class="tbadge flag">⚠ {t.lint.filter((l) => l.level === "warn").length}</span>{/if}
      <button class="tx edit" onclick={() => openEdit(t.id)} aria-label="Edit event">edit</button>
      <button class="tx" onclick={() => (expanded = toggle(expanded, t.id))} aria-label="Toggle raw">{expanded.has(t.id) ? "hide raw" : "raw"}</button>
      <button class="tx del" onclick={() => deleteTrigger(t.id)} aria-label="Delete event">✕</button>
    </div>

    <div class="cause">
      <div class="when">
        <span class="lab">When</span>
        {#if t.whenLines.length}
          <ul>
            {#each t.whenLines as line}<li>{line}</li>{/each}
          </ul>
        {:else}<span class="always">always</span>{/if}
      </div>
      <div class="then">
        <span class="lab">Then</span>
        <ul>
          {#each t.thenLines as line}<li>{line}</li>{/each}
        </ul>
      </div>
    </div>

    {#if t.refs.length}
      <div class="refs">
        {#each t.refs as r}
          <button class="ref" onclick={() => (focusKey = refKey(r))}>{KIND_ICON[r.kind]} {r.name}</button>
        {/each}
      </div>
    {/if}

    {#if t.hasScript}
      <div class="scriptbox">
        <button class="scripttoggle" onclick={() => (scriptOpen = toggle(scriptOpen, t.id))}>
          {scriptOpen.has(t.id) ? "▾" : "▸"} ⚙ JavaScript ({t.script.split("\n").length} lines) — sandboxed: runs after conditions, before effects; check() state, persist storage, skip, or rewrite effects.
          No network or Node, 500 ms budget.
        </button>
        {#if scriptOpen.has(t.id)}<LazyCodeEditor value={t.script} readonly minHeight="40px" />{/if}
      </div>
    {/if}

    {#if t.lint.length}
      <ul class="lint">
        {#each t.lint as l}<li class={l.level}>{l.level === "warn" ? "⚠" : "ℹ"} {l.text}</li>{/each}
      </ul>
    {/if}

    {#if expanded.has(t.id)}
      <pre class="raw">{JSON.stringify(t.raw, null, 2)}</pre>
    {/if}
  </article>
{/snippet}

<style>
  .head {
    margin-bottom: 16px;
  }
  .headrow {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .new {
    font-size: 14px;
    font-weight: 600;
    color: var(--on-link);
    background: var(--accent);
    border: none;
    border-radius: var(--r-md);
    padding: 9px 16px;
    cursor: pointer;
  }
  .new:hover {
    filter: brightness(1.07);
  }
  h2 {
    font-size: 27px;
    font-weight: 800;
    color: var(--heading);
    margin-bottom: 6px;
  }
  .sub {
    font-size: 15px;
    color: var(--muted);
    line-height: 1.5;
    max-width: 720px;
  }
  .empty {
    background: var(--bg-subtle);
    border: 1px solid var(--border-subtle);
    border-radius: var(--r-lg);
    padding: 28px;
    text-align: center;
  }
  .empty p {
    margin: 4px 0;
  }
  .hint {
    font-size: 14px;
    color: var(--muted);
    line-height: 1.5;
  }

  .stats {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 16px;
  }
  .stat {
    background: var(--bg-subtle);
    border: 1px solid var(--border-subtle);
    border-radius: var(--r-md);
    padding: 9px 15px;
    display: flex;
    flex-direction: column;
  }
  .stat b {
    font-size: 21px;
    font-weight: 800;
    color: var(--heading);
  }
  .stat span {
    font-size: 12.5px;
    color: var(--muted);
  }
  .stat.warn b {
    color: var(--warning);
  }
  .stat.warn.on {
    border-color: var(--warning);
  }

  .toolbar {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    align-items: center;
    margin-bottom: 10px;
  }
  .tsearch {
    flex: 1;
    min-width: 240px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    color: var(--text);
    font: inherit;
    font-size: 14.5px;
    padding: 9px 12px;
  }
  .tsearch:focus {
    outline: none;
    border-color: var(--accent);
  }
  .seg {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    background: var(--bg-subtle);
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    padding: 3px;
  }
  .seglabel {
    font-size: 12px;
    color: var(--muted);
    padding: 0 8px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .seg button {
    font-size: 13.5px;
    font-weight: 600;
    color: var(--muted);
    background: none;
    border: none;
    padding: 5px 11px;
    border-radius: 5px;
    cursor: pointer;
  }
  .seg button.cur {
    background: var(--bg);
    color: var(--accent);
  }

  .facets {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    align-items: center;
    margin-bottom: 18px;
  }
  .facets select {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--r-sm);
    color: var(--text);
    font: inherit;
    font-size: 13.5px;
    padding: 6px 8px;
  }
  .chip {
    font-size: 13px;
    font-weight: 600;
    color: var(--muted);
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 5px 12px;
    cursor: pointer;
  }
  .chip.on {
    background: var(--accent-soft);
    border-color: var(--accent);
    color: var(--accent);
  }
  .count {
    font-size: 13px;
    color: var(--muted);
    margin-left: auto;
  }
  .clear {
    font-size: 13px;
    color: var(--accent);
    background: none;
    border: none;
    cursor: pointer;
  }

  .graph {
    background: var(--bg-subtle);
    border: 1px solid var(--border-subtle);
    border-radius: var(--r-lg);
    padding: 14px;
    margin-bottom: 18px;
  }
  .gh {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 14px;
    color: var(--muted);
    margin-bottom: 8px;
  }
  .gh b {
    color: var(--heading);
  }
  .closeg {
    background: none;
    border: none;
    color: var(--muted);
    cursor: pointer;
    font-size: 13px;
  }
  .svg {
    width: 100%;
    height: auto;
    max-height: 360px;
    display: block;
  }
  .edge {
    stroke: var(--border);
    stroke-width: 1.2;
  }
  .hub {
    fill: var(--accent);
  }
  .hublabel {
    fill: var(--heading);
    font-size: 13px;
    font-weight: 700;
  }
  .tnode {
    cursor: pointer;
  }
  .tnode circle {
    fill: var(--bg);
    stroke: var(--accent);
    stroke-width: 2;
    transition: 0.12s;
  }
  .tnode circle.flagged {
    stroke: var(--warning);
  }
  .tnode circle.cluster {
    fill: var(--accent-soft);
  }
  .tnode:hover circle {
    fill: var(--accent);
  }
  .tnode text {
    fill: var(--text);
    font-size: 11px;
  }
  .tnode .cnum {
    fill: var(--accent);
    font-size: 10px;
    font-weight: 700;
  }
  .tnode:hover .cnum {
    fill: var(--on-link);
  }
  .hop {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    align-items: center;
    margin-top: 10px;
  }
  .hoplabel {
    font-size: 12.5px;
    color: var(--muted);
  }
  .echip {
    font-size: 12.5px;
    font-weight: 600;
    color: var(--text);
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 3px 10px;
    cursor: pointer;
  }
  .echip:hover {
    border-color: var(--accent);
    color: var(--accent);
  }
  .echip i {
    color: var(--muted);
    font-style: normal;
    font-size: 11.5px;
  }

  .grouplist {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .group {
    background: var(--bg-subtle);
    border: 1px solid var(--border-subtle);
    border-radius: var(--r-md);
    overflow: hidden;
  }
  .grouphead {
    display: flex;
    align-items: center;
    gap: 9px;
    width: 100%;
    background: none;
    border: none;
    padding: 11px 13px;
    cursor: pointer;
    text-align: left;
  }
  .grouphead:hover {
    background: var(--bg);
  }
  .caret {
    color: var(--muted);
    font-size: 12px;
    width: 12px;
  }
  .gname {
    font-size: 15.5px;
    font-weight: 650;
    color: var(--heading);
  }
  .gkind {
    font-size: 11.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--muted);
  }
  .gcount {
    font-size: 13px;
    font-weight: 700;
    color: var(--muted);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 0 8px;
  }
  .gwarn {
    font-size: 12.5px;
    font-weight: 700;
    color: var(--warning);
  }
  .gfocus {
    margin-left: auto;
    font-size: 12.5px;
    font-weight: 600;
    color: var(--accent);
  }
  .gfocus:hover {
    text-decoration: underline;
  }
  .groupbody {
    padding: 4px 13px 13px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .pager {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    margin-top: 16px;
    font-size: 13px;
    color: var(--muted);
  }
  .pager button {
    width: 30px;
    height: 30px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--r-sm);
    color: var(--text);
    cursor: pointer;
    font-size: 16px;
    line-height: 1;
  }
  .pager button:hover:not(:disabled) {
    border-color: var(--accent);
    color: var(--accent);
  }
  .pager button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .tc {
    background: var(--bg);
    border: 1px solid var(--border-subtle);
    border-radius: var(--r-md);
    padding: 12px 14px;
  }
  .grouplist .tc {
    background: var(--bg);
  }
  .tch {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 9px;
    flex-wrap: wrap;
  }
  .tname {
    font-family: var(--font-mono);
    font-size: 14px;
    color: var(--heading);
  }
  .tbadge {
    font-size: 11.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    padding: 1px 7px;
    border-radius: 20px;
  }
  .tbadge.rec {
    color: var(--accent);
    background: var(--accent-soft);
  }
  .tbadge.once {
    color: var(--muted);
    background: var(--bg-subtle);
  }
  .tbadge.script {
    color: var(--warning);
    background: color-mix(in srgb, var(--warning) 13%, transparent);
  }
  .tbadge.flag {
    color: var(--error);
    background: color-mix(in srgb, var(--error) 13%, transparent);
  }
  .tx {
    font-size: 12.5px;
    color: var(--muted);
    background: none;
    border: 1px solid var(--border);
    border-radius: var(--r-sm);
    padding: 3px 9px;
    cursor: pointer;
  }
  .tx:hover {
    border-color: var(--accent);
    color: var(--accent);
  }
  .tx.edit {
    margin-left: auto;
  }
  .tx.del:hover {
    border-color: var(--error);
    color: var(--error);
  }

  .cause {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  @container page (max-width: 680px) {
    .cause {
      grid-template-columns: 1fr;
    }
  }
  .when,
  .then {
    background: var(--bg-subtle);
    border-radius: var(--r-sm);
    padding: 8px 11px;
  }
  .lab {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--muted);
    display: block;
    margin-bottom: 5px;
  }
  .when ul,
  .then ul {
    margin: 0;
    padding-left: 16px;
  }
  .when li,
  .then li {
    font-size: 13.5px;
    line-height: 1.5;
    color: var(--text);
  }
  .then .lab {
    color: var(--success);
  }
  .always {
    font-size: 13.5px;
    color: var(--muted);
    font-style: italic;
  }

  .refs {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    margin-top: 9px;
  }
  .ref {
    font-size: 12.5px;
    font-weight: 600;
    color: var(--text);
    background: var(--bg-subtle);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 3px 10px;
    cursor: pointer;
  }
  .ref:hover {
    border-color: var(--accent);
    color: var(--accent);
  }

  .lint {
    margin: 9px 0 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .lint li {
    font-size: 12.5px;
    line-height: 1.45;
  }
  .lint li.warn {
    color: var(--warning);
  }
  .lint li.info {
    color: var(--muted);
  }

  .raw {
    margin: 10px 0 0;
    background: var(--code);
    border: 1px solid var(--border-code);
    border-radius: var(--r-sm);
    padding: 11px;
    font-family: var(--font-mono);
    font-size: 12.5px;
    color: var(--text);
    overflow-x: auto;
    max-height: 320px;
  }
  .scriptbox {
    margin-top: 9px;
    border: 1px solid color-mix(in srgb, var(--warning) 30%, transparent);
    border-radius: var(--r-sm);
    background: color-mix(in srgb, var(--warning) 5%, transparent);
  }
  .scripttoggle {
    display: block;
    width: 100%;
    text-align: left;
    font-size: 12.5px;
    color: var(--warning);
    cursor: pointer;
    padding: 7px 10px;
    font-weight: 600;
    background: none;
    border: none;
    line-height: 1.4;
  }
  .scripttoggle:hover {
    background: color-mix(in srgb, var(--warning) 8%, transparent);
  }
</style>
