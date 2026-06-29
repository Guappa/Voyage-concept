<script>
  import { siteMeta, persistSite } from "../lib/store.svelte.js";
  import { MOD_CATALOG, MOD_CATEGORIES, modById, computeConflicts } from "../lib/mods.js";

  let filter = $state("all");

  $effect(() => {
    JSON.stringify(siteMeta.enabledMods);
    persistSite();
  });

  const enabled = $derived(siteMeta.enabledMods);
  const conflicts = $derived(computeConflicts(enabled));

  const isOn = (id) => enabled.includes(id);

  function toggle(id) {
    siteMeta.enabledMods = isOn(id) ? enabled.filter((x) => x !== id) : [...enabled, id];
  }

  // load order decides which mod wins a conflict, so creators can reorder enabled mods
  function move(id, dir) {
    const i = enabled.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= enabled.length) return;
    const next = [...enabled];
    [next[i], next[j]] = [next[j], next[i]];
    siteMeta.enabledMods = next;
  }

  function affects(mod) {
    return {
      adds: mod.changes.filter((c) => c.op === "add").length,
      overrides: mod.changes.filter((c) => c.op === "override").length,
      sections: [...new Set(mod.changes.map((c) => c.section))],
    };
  }

  const conflictsFor = (id) => conflicts.filter((c) => c.mods.some((m) => m.modId === id)).length;

  const modsIn = (catId) => MOD_CATALOG.filter((mod) => mod.category === catId);
  const visibleCategories = $derived(filter === "all" ? MOD_CATEGORIES : MOD_CATEGORIES.filter((c) => c.id === filter));
</script>

<div class="ml">
  <div class="crumb">Studio · <b>Mod Library</b></div>
  <h1>Mod Library</h1>
  <p class="blurb">
    Mods are reusable changes a world attaches: each one adds new content or overrides existing settings. Enable any combination; when two mods touch the same thing, the one loaded last wins.
  </p>

  <div class="active card">
    <div class="ph">
      <h3>Active mods <span class="muted">· {enabled.length} enabled · load order</span></h3>
      {#if conflicts.length}
        <span class="cflag bad">⚠ {conflicts.length} conflict{conflicts.length > 1 ? "s" : ""}</span>
      {:else if enabled.length}
        <span class="cflag ok">✓ no conflicts</span>
      {/if}
    </div>

    {#if enabled.length === 0}
      <p class="empty">No mods enabled. Turn one on below to attach it to the world.</p>
    {:else}
      <ol class="order">
        {#each enabled as id, i}
          {@const mod = modById(id)}
          <li>
            <span class="num">{i + 1}</span>
            <span class="oglyph" style="background:{mod.color}">{mod.glyph}</span>
            <span class="oname">{mod.name}</span>
            {#if conflictsFor(id)}<span class="cbadge">in {conflictsFor(id)} conflict{conflictsFor(id) > 1 ? "s" : ""}</span>{/if}
            <span class="ord">
              <button onclick={() => move(id, -1)} disabled={i === 0} aria-label="Move up">▲</button>
              <button onclick={() => move(id, 1)} disabled={i === enabled.length - 1} aria-label="Move down">▼</button>
            </span>
            <button class="off" onclick={() => toggle(id)}>Disable</button>
          </li>
        {/each}
      </ol>
    {/if}

    {#if conflicts.length}
      <div class="cflist">
        {#each conflicts as c}
          <div class="crow">
            <span class="ckey">{c.section} · <b>{c.target}</b></span>
            <span class="cmods">
              {#each c.mods as m, i}{i > 0 ? ", " : ""}<span class:win={m.name === c.winner}>{m.name}</span>{/each}
            </span>
            <span class="cwin">{c.winner} wins</span>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <div class="catbar">
    <h3 class="catlabel">All mods</h3>
    <div class="filters">
      <button class:on={filter === "all"} onclick={() => (filter = "all")}>All <span>{MOD_CATALOG.length}</span></button>
      {#each MOD_CATEGORIES as cat}
        <button class:on={filter === cat.id} onclick={() => (filter = cat.id)}>{cat.label} <span>{modsIn(cat.id).length}</span></button>
      {/each}
    </div>
  </div>

  {#snippet modCard(mod)}
    {@const a = affects(mod)}
    <div class="mod card" class:on={isOn(mod.id)}>
      <span class="glyph" style="background:{mod.color}">{mod.glyph}</span>
      <div class="body">
        <div class="top">
          <div class="title"><b>{mod.name}</b><span class="by">by {mod.author}</span></div>
          <button class="switch" class:active={isOn(mod.id)} role="switch" aria-checked={isOn(mod.id)} aria-label={`Enable ${mod.name}`} onclick={() => toggle(mod.id)}><span></span></button>
        </div>
        <p class="desc">{mod.summary}</p>
        <div class="meta">
          {#if a.adds}<span class="pill add">+{a.adds} added</span>{/if}
          {#if a.overrides}<span class="pill over">{a.overrides} overridden</span>{/if}
          {#each a.sections as s}<span class="pill sec">{s}</span>{/each}
        </div>
        {#if isOn(mod.id) && conflictsFor(mod.id)}
          <p class="warn">⚠ Conflicts with another enabled mod over shared content.</p>
        {/if}
      </div>
    </div>
  {/snippet}

  {#each visibleCategories as cat}
    <section class="catgroup">
      <div class="cathead">
        <h4>{cat.label}</h4>
        <span>{cat.note}</span>
      </div>
      <div class="cat">
        {#each modsIn(cat.id) as mod}{@render modCard(mod)}{/each}
      </div>
    </section>
  {/each}
</div>

<style>
  .ml {
    max-width: 900px;
    margin: 0 auto;
  }
  .crumb {
    font-size: var(--fs-sm);
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
    margin-bottom: 18px;
    line-height: 1.55;
  }
  .card {
    background: var(--bg-subtle);
    border: 1px solid var(--border-subtle);
    border-radius: var(--r-lg);
    box-shadow: var(--shadow-card);
  }
  .active {
    padding: 16px 18px;
    margin-bottom: 26px;
  }
  .ph {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
  }
  .ph h3 {
    font-size: var(--fs-md);
  }
  .ph .muted {
    color: var(--muted);
    font-weight: 400;
    font-size: var(--fs-sm);
  }
  .cflag {
    flex-shrink: 0;
    font-size: var(--fs-xs);
    font-weight: 700;
    border-radius: 20px;
    padding: 4px 11px;
  }
  .cflag.bad {
    color: var(--warning);
    background: color-mix(in srgb, var(--warning) 12%, transparent);
  }
  .cflag.ok {
    color: var(--success);
    background: color-mix(in srgb, var(--success) 12%, transparent);
  }
  .empty {
    color: var(--muted);
    font-size: var(--fs-sm);
    padding: 8px 0;
  }
  .order {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .order li {
    display: flex;
    align-items: center;
    gap: 10px;
    background: var(--bg);
    border: 1px solid var(--border-subtle);
    border-radius: var(--r-md);
    padding: 8px 11px;
  }
  .num {
    flex-shrink: 0;
    width: 22px;
    height: 22px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: var(--bg-subtle);
    border: 1px solid var(--border);
    font-size: var(--fs-xs);
    font-weight: 700;
    color: var(--muted);
  }
  .oglyph {
    flex-shrink: 0;
    width: 28px;
    height: 28px;
    display: grid;
    place-items: center;
    border-radius: var(--r-sm);
    font-size: var(--fs-sm);
  }
  .oname {
    flex: 1;
    font-weight: 600;
    font-size: var(--fs-sm);
  }
  .cbadge {
    font-size: var(--fs-xs);
    font-weight: 700;
    color: var(--warning);
    background: color-mix(in srgb, var(--warning) 12%, transparent);
    border-radius: 20px;
    padding: 2px 8px;
  }
  .ord {
    display: flex;
    gap: 2px;
  }
  .ord button {
    width: 24px;
    height: 24px;
    background: var(--bg-subtle);
    border: 1px solid var(--border);
    border-radius: var(--r-sm);
    color: var(--muted);
    cursor: pointer;
    font-size: 10px;
  }
  .ord button:hover:not(:disabled) {
    border-color: var(--accent);
    color: var(--accent);
  }
  .ord button:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
  .off {
    font-size: var(--fs-xs);
    font-weight: 600;
    color: var(--muted);
    background: none;
    border: 1px solid var(--border);
    border-radius: var(--r-sm);
    padding: 5px 10px;
    cursor: pointer;
  }
  .off:hover {
    border-color: var(--error);
    color: var(--error);
  }
  .cflist {
    margin-top: 14px;
    padding-top: 14px;
    border-top: 1px solid var(--border-subtle);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .crow {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    font-size: var(--fs-sm);
  }
  .ckey {
    color: var(--warning);
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
  }
  .ckey b {
    color: var(--text);
  }
  .cmods {
    flex: 1;
    color: var(--muted);
    min-width: 140px;
  }
  .cmods .win {
    color: var(--text);
    font-weight: 600;
  }
  .cwin {
    flex-shrink: 0;
    font-size: var(--fs-xs);
    font-weight: 700;
    color: var(--accent);
  }
  .catbar {
    margin-bottom: 16px;
  }
  .catlabel {
    font-size: var(--fs-md);
    margin-bottom: 12px;
  }
  .filters {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
  }
  .filters button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: var(--bg);
    border: 1px solid var(--border);
    color: var(--muted);
    border-radius: 20px;
    padding: 6px 13px;
    font-size: var(--fs-xs);
    font-weight: 600;
    cursor: pointer;
  }
  .filters button.on {
    background: var(--accent-soft);
    border-color: var(--accent);
    color: var(--accent);
  }
  .filters button span {
    font-size: 11px;
    opacity: 0.75;
  }
  .catgroup {
    margin-bottom: 26px;
  }
  .cathead {
    display: flex;
    align-items: baseline;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 11px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--border-subtle);
  }
  .cathead h4 {
    font-size: var(--fs-base);
  }
  .cathead span {
    font-size: var(--fs-xs);
    color: var(--muted);
  }
  .cat {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .mod {
    display: flex;
    gap: 14px;
    padding: 16px;
    transition: border-color 0.14s;
  }
  .mod.on {
    border-color: color-mix(in srgb, var(--accent) 45%, var(--border-subtle));
  }
  .glyph {
    flex-shrink: 0;
    width: 48px;
    height: 48px;
    display: grid;
    place-items: center;
    border-radius: var(--r-md);
    font-size: 24px;
  }
  .body {
    flex: 1;
    min-width: 0;
  }
  .top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }
  .title {
    display: flex;
    align-items: baseline;
    gap: 9px;
    flex-wrap: wrap;
  }
  .title b {
    font-size: var(--fs-md);
  }
  .by {
    font-size: var(--fs-xs);
    color: var(--muted);
  }
  .desc {
    color: var(--muted);
    font-size: var(--fs-sm);
    line-height: 1.5;
    margin: 5px 0 10px;
  }
  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .pill {
    font-size: var(--fs-xs);
    border-radius: 20px;
    padding: 3px 9px;
    border: 1px solid var(--border);
    color: var(--muted);
  }
  .pill.add {
    color: var(--success);
    border-color: color-mix(in srgb, var(--success) 40%, transparent);
  }
  .pill.over {
    color: var(--warning);
    border-color: color-mix(in srgb, var(--warning) 40%, transparent);
  }
  .warn {
    margin-top: 9px;
    font-size: var(--fs-xs);
    color: var(--warning);
  }
  .switch {
    flex-shrink: 0;
    width: 46px;
    height: 26px;
    border-radius: 20px;
    border: none;
    background: var(--border);
    cursor: pointer;
    padding: 3px;
    transition: background 0.15s;
  }
  .switch.active {
    background: var(--accent);
  }
  .switch span {
    display: block;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #fff;
    transition: transform 0.15s;
  }
  .switch.active span {
    transform: translateX(20px);
  }
</style>
