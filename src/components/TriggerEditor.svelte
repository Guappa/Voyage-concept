<script>
  import { CONDITION_TYPES, EFFECT_TYPES, conditionSpec, effectSpec, availableTargets, isBeyondType, isBeyondTarget, beyondNote, emptyConditionRow, emptyEffectRow } from "../lib/engine/triggers.js";
  import LazyCodeEditor from "./LazyCodeEditor.svelte";
  import SelectField from "./SelectField.svelte";
  import ClauseControls from "./ClauseControls.svelte";
  import { named } from "../lib/named.js";

  let { draft, vocab, onsave, oncancel } = $props();

  // CodeEditor binds value with a "" fallback, so an undefined script would trip Svelte's props_invalid_value guard
  // svelte-ignore state_referenced_locally
  if (draft.script == null) draft.script = "";

  // svelte-ignore state_referenced_locally
  let showScript = $state(!!draft.script);
  const targets = $derived(availableTargets(draft));

  function setRowType(row, list, type) {
    const fresh = list === "cond" ? emptyConditionRow(type) : emptyEffectRow(type);
    for (const k of Object.keys(row)) delete row[k];
    Object.assign(row, fresh);
  }

  function addCondition() {
    draft.conditions = [...(draft.conditions ?? []), emptyConditionRow()];
  }
  function addEffect() {
    draft.effects = [...(draft.effects ?? []), emptyEffectRow()];
  }
  function removeCondition(i) {
    draft.conditions.splice(i, 1);
  }
  function removeEffect(i) {
    draft.effects.splice(i, 1);
  }

  const valid = $derived((draft.name ?? "").trim().length > 0 && (draft.effects?.length ?? 0) > 0);
</script>

<div class="scrim" onclick={(e) => e.target === e.currentTarget && oncancel()} role="presentation">
  <div class="modal" role="dialog" aria-modal="true" aria-label="Edit event" tabindex="-1">
    <div class="mh">
      <h3>{draft.__isNew ? "New event" : "Edit event"}</h3>
      <button class="x" onclick={oncancel} aria-label="Close">✕</button>
    </div>

    <div class="mb">
      <div class="namerow">
        <label class="fld">
          <span>Name</span>
          <input use:named bind:value={draft.name} placeholder="quest_bootstrap" />
        </label>
        <label class="rec">
          <input use:named type="checkbox" bind:checked={draft.recurring} />
          recurring <i>(fires every turn its conditions hold)</i>
        </label>
      </div>

      <p class="legend">✦ marks proposed capabilities beyond the current engine, shown to demo where triggers could go.</p>

      <div class="block">
        <div class="bh"><span class="lab when">When</span><span class="hint">all conditions must hold · empty = every turn</span></div>
        {#each draft.conditions ?? [] as row, i}
          {@const spec = conditionSpec(row.type)}
          <div class="row">
            <SelectField
              variant="type"
              value={row.type}
              options={CONDITION_TYPES.map((c) => ({ value: c.type, label: (c.beyond ? "✦ " : "") + c.label }))}
              onchange={(v) => setRowType(row, "cond", v)}
            />
            <ClauseControls {row} {spec} {vocab} />
            <button class="rx" onclick={() => removeCondition(i)} aria-label="Remove condition">✕</button>
          </div>
          {#if isBeyondType(row.type)}<p class="beyondnote">✦ {beyondNote(row.type)}</p>{/if}
        {/each}
        <button class="add" onclick={addCondition}>＋ condition</button>
      </div>

      <div class="block">
        <div class="bh"><span class="lab then">Then</span><span class="hint">effects fire in order when conditions pass</span></div>
        {#each draft.effects ?? [] as row, i}
          {@const spec = effectSpec(row.type)}
          <div class="row">
            <SelectField
              variant="type"
              value={row.type}
              options={EFFECT_TYPES.map((eff) => ({ value: eff.type, label: (eff.beyond ? "✦ " : "") + eff.label }))}
              onchange={(v) => setRowType(row, "eff", v)}
            />
            <ClauseControls {row} {spec} {vocab} />
            {#if spec.targetable}
              <span class="totag">to</span>
              {#if targets.length > 1}
                <SelectField
                  variant="target"
                  value={targets.some((t) => t.id === row.target) ? row.target : "party"}
                  options={targets.map((t) => ({ value: t.id, label: (t.beyond ? "✦ " : "") + t.label }))}
                  onchange={(v) => (row.target = v)}
                />
              {:else}
                <span class="targetnote" title="Add a player-trait/level/resource or action condition to target a subset">the whole party ⓘ</span>
              {/if}
            {/if}
            <button class="rx" onclick={() => removeEffect(i)} aria-label="Remove effect">✕</button>
          </div>
          {#if isBeyondType(row.type)}
            <p class="beyondnote">✦ {beyondNote(row.type)}</p>
          {:else if spec.targetable && isBeyondTarget(row.target) && targets.length > 1}
            <p class="beyondnote">✦ Per-player targeting is beyond the current engine, which applies trait and resource effects to the whole party.</p>
          {/if}
        {/each}
        <button class="add" onclick={addEffect}>＋ effect</button>
      </div>

      <div class="block">
        <button class="scripttoggle" onclick={() => (showScript = !showScript)}>{showScript ? "▾" : "▸"} Advanced: JavaScript</button>
        {#if showScript}
          <p class="hint">Sandboxed: runs after conditions, before effects. Reach for it only for OR-logic, counters, or derived math. No network or Node, 500 ms budget.</p>
          <div class="scriptwrap"><LazyCodeEditor bind:value={draft.script} placeholder="// optional — e.g. storage.n = (storage.n||0)+1; if (storage.n % 10) skip = true" /></div>
        {/if}
      </div>
    </div>

    <div class="mf">
      <button class="cancel" onclick={oncancel}>Cancel</button>
      <button class="save" disabled={!valid} onclick={() => onsave(draft)}>Save event</button>
    </div>
  </div>
</div>

<style>
  .scrim {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.55);
    z-index: 60;
    display: grid;
    place-items: center;
    padding: 24px;
  }
  .modal {
    width: 100%;
    max-width: 760px;
    max-height: 88vh;
    display: flex;
    flex-direction: column;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    box-shadow: var(--shadow-hover);
    overflow: hidden;
  }
  .mh {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 18px;
    border-bottom: 1px solid var(--border-subtle);
  }
  .mh h3 {
    font-size: 18px;
    font-weight: 700;
    color: var(--heading);
  }
  .x {
    background: none;
    border: none;
    color: var(--muted);
    font-size: 18px;
    cursor: pointer;
  }
  .mb {
    padding: 16px 18px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .namerow {
    display: flex;
    gap: 16px;
    align-items: flex-end;
    flex-wrap: wrap;
  }
  .fld {
    display: flex;
    flex-direction: column;
    gap: 5px;
    flex: 1;
    min-width: 220px;
  }
  .fld span {
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--muted);
  }
  .fld input {
    background: var(--bg-subtle);
    border: 1px solid var(--border);
    border-radius: var(--r-sm);
    color: var(--text);
    font: inherit;
    font-family: var(--font-mono);
    font-size: 14px;
    padding: 8px 10px;
  }
  .rec {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 14px;
    color: var(--text);
    padding-bottom: 8px;
  }
  .rec i {
    color: var(--muted);
    font-size: 12.5px;
  }

  .block {
    border: 1px solid var(--border-subtle);
    border-radius: var(--r-md);
    padding: 11px 12px;
    background: var(--bg-subtle);
  }
  .bh {
    display: flex;
    align-items: baseline;
    gap: 10px;
    margin-bottom: 9px;
  }
  .lab {
    font-size: 12px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .lab.when {
    color: var(--accent);
  }
  .lab.then {
    color: var(--success);
  }
  .hint {
    font-size: 12.5px;
    color: var(--muted);
    line-height: 1.5;
  }
  .row {
    display: flex;
    gap: 6px;
    align-items: flex-start;
    margin-bottom: 6px;
    flex-wrap: wrap;
  }
  .totag {
    font-size: 12.5px;
    color: var(--muted);
    align-self: center;
  }
  .targetnote {
    font-size: 12.5px;
    color: var(--muted);
    align-self: center;
    cursor: help;
  }
  .legend {
    font-size: 12px;
    color: var(--beyond, #a78bfa);
  }
  .beyondnote {
    font-size: 12px;
    color: var(--beyond, #a78bfa);
    line-height: 1.45;
    margin: -2px 0 7px 2px;
    flex-basis: 100%;
  }
  .rx {
    background: none;
    border: none;
    color: var(--muted);
    cursor: pointer;
    font-size: 14px;
    padding: 6px 2px;
    margin-left: auto;
  }
  .rx:hover {
    color: var(--error);
  }
  .add {
    font-size: 13px;
    font-weight: 600;
    color: var(--accent);
    background: none;
    border: 1px dashed var(--border);
    border-radius: var(--r-sm);
    padding: 5px 11px;
    cursor: pointer;
  }
  .add:hover {
    background: var(--accent-soft);
    border-color: var(--accent);
  }

  .scripttoggle {
    font-size: 13.5px;
    font-weight: 600;
    color: var(--warning);
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
  }
  .scriptwrap {
    margin-top: 8px;
    border: 1px solid var(--border-code);
    border-radius: var(--r-sm);
    overflow: hidden;
  }

  .mf {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding: 13px 18px;
    border-top: 1px solid var(--border-subtle);
  }
  .cancel {
    background: var(--bg);
    border: 1px solid var(--border);
    color: var(--text);
    border-radius: var(--r-md);
    padding: 8px 16px;
    cursor: pointer;
    font-size: 14px;
  }
  .save {
    background: var(--accent);
    border: none;
    color: var(--on-link);
    border-radius: var(--r-md);
    padding: 8px 18px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
  }
  .save:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
