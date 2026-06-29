<script>
  import { EFFECT_KINDS, STATUS_SCOPES, QUEST_EFFECT_OPS, TRAIT_EFFECT_OPS, emptyEffect } from "../lib/engine/effects.js";
  import OperandInput from "./OperandInput.svelte";

  let { effects, targets, vocab } = $props();

  function add() {
    effects.push(emptyEffect(targets?.[0] ?? ""));
  }

  function remove(index) {
    effects.splice(index, 1);
  }

  // Demo templates may name a quest/trait/entity/location the current world lacks; keep the preset value selectable.
  function withCurrent(list, current) {
    return [...new Set([current, ...(list ?? [])].filter(Boolean))];
  }

  // Switching effect kind seeds that kind's own fields without clobbering any the user already set.
  function setKind(effect, kind) {
    effect.kind = kind;
    if (kind === "status") {
      effect.label ??= "Status";
      effect.turns ??= 2;
      effect.group ??= "";
      effect.scope ??= "self";
      effect.target ??= targets?.[0] ?? "";
      if (effect.value == null) effect.value = 0;
    }
    if (kind === "clearStatus") effect.group ??= "";
    if (kind === "quest") {
      effect.questOp ??= "start";
      effect.quest ??= vocab?.quest?.[0] ?? "";
    }
    if (kind === "trait") {
      effect.traitOp ??= "grant";
      effect.trait ??= vocab?.trait?.[0] ?? "";
    }
    if (kind === "reveal") effect.entity ??= vocab?.entity?.[0] ?? "";
    if (kind === "move") effect.location ??= vocab?.location?.[0] ?? "";
    if (kind === "block") effect.reason ??= "";
  }
</script>

<div class="fx">
  <span class="lbl">Then</span>
  {#each effects as effect, i}
    <div class="fxitem">
      <div class="row">
        <select class="kind" value={effect.kind} onchange={(e) => setKind(effect, e.target.value)} aria-label="Effect">
          {#each EFFECT_KINDS as k}<option value={k.kind}>{k.label}</option>{/each}
        </select>

        {#if effect.kind === "emit"}
          <input class="val" value={effect.event ?? ""} onchange={(e) => (effect.event = e.target.value)} placeholder="event name" />
        {:else if effect.kind === "check"}
          <input class="val sm" type="number" value={effect.value ?? 0} onchange={(e) => (effect.value = Number(e.target.value))} aria-label="Skill check modifier" />
        {:else if effect.kind === "narrate"}
          <input class="val wide" value={effect.text ?? ""} onchange={(e) => (effect.text = e.target.value)} placeholder="what the narrator should weave in" />
        {:else if effect.kind === "status"}
          <input class="val" bind:value={effect.label} placeholder="status name" aria-label="Status name" />
          <span class="lab">for</span>
          <input class="val xs" type="number" min="0" bind:value={effect.turns} aria-label="Duration in turns" />
          <span class="lab">turns</span>
        {:else if effect.kind === "clearStatus"}
          <span class="lab">group</span>
          <input class="val" bind:value={effect.group} placeholder="all" aria-label="Status group to remove" />
        {:else if effect.kind === "quest"}
          <select class="scope" value={effect.questOp ?? "start"} onchange={(e) => (effect.questOp = e.target.value)} aria-label="Quest action">
            {#each QUEST_EFFECT_OPS as o}<option value={o.id}>{o.label}</option>{/each}
          </select>
          <select class="target" value={effect.quest ?? ""} onchange={(e) => (effect.quest = e.target.value)} aria-label="Quest">
            <option value="" disabled>pick…</option>
            {#each withCurrent(vocab?.quest, effect.quest) as name}<option value={name}>{name}</option>{/each}
          </select>
        {:else if effect.kind === "trait"}
          <select class="scope" value={effect.traitOp ?? "grant"} onchange={(e) => (effect.traitOp = e.target.value)} aria-label="Trait action">
            {#each TRAIT_EFFECT_OPS as o}<option value={o.id}>{o.label}</option>{/each}
          </select>
          <select class="target" value={effect.trait ?? ""} onchange={(e) => (effect.trait = e.target.value)} aria-label="Trait">
            <option value="" disabled>pick…</option>
            {#each withCurrent(vocab?.trait, effect.trait) as name}<option value={name}>{name}</option>{/each}
          </select>
        {:else if effect.kind === "reveal"}
          <select class="target" value={effect.entity ?? ""} onchange={(e) => (effect.entity = e.target.value)} aria-label="Entity to reveal">
            <option value="" disabled>pick…</option>
            {#each withCurrent(vocab?.entity, effect.entity) as name}<option value={name}>{name}</option>{/each}
          </select>
        {:else if effect.kind === "move"}
          <select class="target" value={effect.location ?? ""} onchange={(e) => (effect.location = e.target.value)} aria-label="Destination">
            <option value="" disabled>pick…</option>
            {#each withCurrent(vocab?.location, effect.location) as name}<option value={name}>{name}</option>{/each}
          </select>
        {:else if effect.kind === "block"}
          <input class="val wide" value={effect.reason ?? ""} onchange={(e) => (effect.reason = e.target.value)} placeholder="why the action is blocked (shown to the player)" />
        {:else}
          <select class="target" value={effect.target ?? ""} onchange={(e) => (effect.target = e.target.value)} aria-label="Target component">
            <option value="" disabled>pick…</option>
            {#each targets ?? [] as name}<option value={name}>{name}</option>{/each}
          </select>
          <OperandInput bind:value={effect.value} {vocab} />
        {/if}

        <button class="rx" onclick={() => remove(i)} aria-label="Remove effect">×</button>
      </div>

      {#if effect.kind === "status"}
        <div class="statusrow">
          <span class="lab">grants</span>
          <select class="target" value={effect.target ?? ""} onchange={(e) => (effect.target = e.target.value)} aria-label="Status target component">
            <option value="" disabled>pick…</option>
            {#each targets ?? [] as name}<option value={name}>{name}</option>{/each}
          </select>
          <span class="lab">add</span>
          <OperandInput bind:value={effect.value} {vocab} />
          <span class="lab">group</span>
          <input class="val sm" bind:value={effect.group} placeholder="(optional)" aria-label="Status group" />
          <span class="lab">to</span>
          <select class="scope" value={effect.scope ?? "self"} onchange={(e) => (effect.scope = e.target.value)} aria-label="Status scope">
            {#each STATUS_SCOPES as s}<option value={s.id}>{s.label}</option>{/each}
          </select>
        </div>
      {/if}
    </div>
  {/each}
  <button class="addf" onclick={add}>＋ add effect</button>
</div>

<style>
  .fx {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .lbl {
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--muted);
  }
  .fxitem {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 5px;
    flex-wrap: wrap;
  }
  .statusrow {
    display: flex;
    align-items: center;
    gap: 5px;
    flex-wrap: wrap;
    padding-left: 9px;
    margin-left: 2px;
    border-left: 2px solid var(--accent-soft);
  }
  .row select,
  .row input,
  .statusrow select,
  .statusrow input {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--r-sm);
    color: var(--text);
    font: inherit;
    font-size: 14px;
    padding: 5px 7px;
  }
  .lab {
    font-size: 13px;
    color: var(--muted);
  }
  .kind {
    color: var(--success);
  }
  .val {
    width: 130px;
  }
  .val.sm {
    width: 90px;
  }
  .val.xs {
    width: 48px;
  }
  .val.wide {
    flex: 1;
    min-width: 180px;
  }
  .rx {
    margin-left: auto;
    background: none;
    border: none;
    color: var(--muted);
    cursor: pointer;
    font-size: 16px;
  }
  .rx:hover {
    color: var(--error);
  }
  .addf {
    align-self: flex-start;
    font-size: 13.5px;
    font-weight: 600;
    color: var(--accent);
    border: 1px dashed var(--border);
    border-radius: var(--r-md);
    padding: 5px 10px;
    cursor: pointer;
    background: none;
  }
  .addf:hover {
    background: var(--accent-soft);
    border-color: var(--accent);
  }
</style>
