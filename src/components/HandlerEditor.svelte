<script>
  import { EVENT_CATALOG, eventSubject, SANDBOX_LIMITS, SCRIPT_API } from "../lib/engine/events.js";
  import ConditionBuilder from "./ConditionBuilder.svelte";
  import EffectEditor from "./EffectEditor.svelte";
  import LazyCodeEditor from "./LazyCodeEditor.svelte";

  let { handler, vocab, targets, onremove } = $props();

  const note = $derived(EVENT_CATALOG.find((e) => e.id === handler.event)?.note ?? "");
  const subject = $derived(eventSubject(handler.event));
  // Keep any preset subject pickable even if the imported world has no matching entry yet.
  const subjectChoices = $derived([...new Set([handler.subject, ...(subject ? (vocab?.[subject.kind] ?? []) : [])].filter(Boolean))]);
  let showLimits = $state(false);

  function setEvent(id) {
    handler.event = id;
    handler.subject = "";
  }

  function setMode(mode) {
    handler.mode = mode;
    if (mode === "script" && typeof handler.script !== "string") handler.script = "";
  }
</script>

<div class="handler">
  <div class="hh">
    <span class="kw">on</span>
    <select class="event" value={handler.event} onchange={(e) => setEvent(e.target.value)} aria-label="Event">
      {#each EVENT_CATALOG as ev}<option value={ev.id}>{ev.label}</option>{/each}
    </select>
    {#if subject}
      <span class="kw">·</span>
      <select class="subject" value={handler.subject ?? ""} onchange={(e) => (handler.subject = e.target.value)} aria-label="Event subject">
        <option value="">any {subject.label}</option>
        {#each subjectChoices as name}<option value={name}>{name}</option>{/each}
      </select>
    {/if}
    <span class="note">{note}</span>
    <div class="modes">
      <button class:cur={handler.mode !== "script"} onclick={() => setMode("rules")}>No-code</button>
      <button class:cur={handler.mode === "script"} onclick={() => setMode("script")}>Script</button>
    </div>
    <button class="x" onclick={onremove} aria-label="Remove rule">×</button>
  </div>

  {#if handler.mode === "script"}
    <div class="sbody">
      <LazyCodeEditor bind:value={handler.script} placeholder={'// runs in the engine sandbox\nif (ctx.fuel <= 0) {\n  ctx.speed = 0\n  ctx.narrate("The engine sputters and dies.")\n}'} />
      <button class="limits-toggle" onclick={() => (showLimits = !showLimits)}>{showLimits ? "▾" : "▸"} Sandbox &amp; API</button>
      {#if showLimits}
        <div class="limits">
          <p>{SANDBOX_LIMITS.intro}</p>
          <div class="api">
            {#each SCRIPT_API as row}<div><code>{row.sig}</code><span>{row.note}</span></div>{/each}
          </div>
          <ul>
            {#each SANDBOX_LIMITS.rules as rule}<li>{rule}</li>{/each}
          </ul>
        </div>
      {/if}
    </div>
  {:else}
    <div class="body">
      <ConditionBuilder condition={handler.when} {vocab} />
      <EffectEditor effects={handler.effects} {targets} {vocab} />
    </div>
  {/if}
</div>

<style>
  .handler {
    border: 1px solid var(--border-subtle);
    border-left: 3px solid var(--accent);
    border-radius: var(--r-md);
    margin-bottom: 10px;
    overflow: hidden;
  }
  .hh {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    background: var(--bg);
    flex-wrap: wrap;
  }
  .kw {
    font-family: var(--font-mono);
    font-size: 14px;
    color: var(--muted);
  }
  .event {
    background: var(--bg-subtle);
    border: 1px solid var(--border);
    border-radius: var(--r-sm);
    color: var(--accent);
    font-weight: 600;
    font-size: 15px;
    padding: 5px 8px;
  }
  .subject {
    background: var(--bg-subtle);
    border: 1px solid var(--border);
    border-radius: var(--r-sm);
    color: var(--warning);
    font-weight: 600;
    font-size: 15px;
    padding: 5px 8px;
  }
  .note {
    flex: 1;
    min-width: 100px;
    font-size: 13px;
    color: var(--muted);
  }
  .modes {
    display: flex;
    gap: 2px;
    background: var(--bg-subtle);
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    padding: 2px;
  }
  .modes button {
    font-size: 13px;
    font-weight: 600;
    color: var(--muted);
    background: none;
    border: none;
    padding: 4px 9px;
    border-radius: 5px;
    cursor: pointer;
  }
  .modes button.cur {
    background: var(--bg);
    color: var(--accent);
  }
  .x {
    background: none;
    border: none;
    color: var(--muted);
    font-size: 19px;
    cursor: pointer;
  }
  .x:hover {
    color: var(--error);
  }
  .body {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
    padding: 11px;
    align-items: start;
  }
  @container page (max-width: 900px) {
    .body {
      grid-template-columns: 1fr;
    }
  }
  .sbody {
    padding: 0;
  }
  .limits-toggle {
    background: none;
    border: none;
    color: var(--muted);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    padding: 7px 11px;
  }
  .limits {
    padding: 0 11px 11px;
    font-size: 13px;
    color: var(--muted);
    line-height: 1.5;
  }
  .api {
    margin: 8px 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .api div {
    display: flex;
    gap: 8px;
  }
  .api code {
    font-family: var(--font-mono);
    color: var(--accent);
    min-width: 140px;
  }
  .limits ul {
    margin: 6px 0 0 16px;
  }
  .limits li {
    margin-bottom: 3px;
  }
</style>
