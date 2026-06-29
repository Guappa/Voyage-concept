<script>
  import { REF_KINDS, opsFor, opLabel, needsValue, subjectInValue, emptyClause, describeCondition } from "../lib/engine/conditions.js";
  import OperandInput from "./OperandInput.svelte";

  let { condition, vocab, label = "Fires when" } = $props();

  const clauses = $derived(condition?.clauses ?? []);
  const summary = $derived(describeCondition(condition));

  function addClause() {
    condition.clauses = [...clauses, emptyClause()];
  }

  function removeClause(index) {
    condition.clauses = clauses.filter((_, i) => i !== index);
  }

  function setKind(clause, kind) {
    clause.ref.kind = kind;
    clause.ref.name = "";
    clause.op = opsFor(kind)[0];
    clause.value = "";
  }

  function setOp(clause, op) {
    clause.op = op;
    if (!needsValue(op)) clause.value = "";
  }

  function namesFor(kind) {
    return vocab?.[kind] ?? [];
  }
</script>

<div class="cond">
  <div class="ch">
    <span class="lbl">{label}</span>
    {#if clauses.length > 1}
      <div class="mode">
        <button class:cur={condition.mode !== "any"} onclick={() => (condition.mode = "all")}>all</button>
        <button class:cur={condition.mode === "any"} onclick={() => (condition.mode = "any")}>any</button>
      </div>
    {/if}
    <span class="sum">{summary}</span>
  </div>

  {#each clauses as clause, i}
    <div class="clause">
      <select class="kind" value={clause.ref.kind} onchange={(e) => setKind(clause, e.target.value)} aria-label="Condition reference kind">
        {#each REF_KINDS as k}<option value={k.kind}>{k.label}</option>{/each}
      </select>

      {#if !subjectInValue(clause.ref.kind)}
        <select class="name" value={clause.ref.name} onchange={(e) => (clause.ref.name = e.target.value)} aria-label="Condition reference">
          <option value="" disabled>{namesFor(clause.ref.kind).length ? "pick…" : "none defined"}</option>
          {#each namesFor(clause.ref.kind) as name}<option value={name}>{name}</option>{/each}
        </select>
      {/if}

      <select class="op" value={clause.op} onchange={(e) => setOp(clause, e.target.value)} aria-label="Condition operator">
        {#each opsFor(clause.ref.kind) as op}<option value={op}>{opLabel(op, clause.ref.kind)}</option>{/each}
      </select>

      {#if subjectInValue(clause.ref.kind)}
        <select class="name" value={clause.value} onchange={(e) => (clause.value = e.target.value)} aria-label="Condition value">
          <option value="" disabled>{namesFor(clause.ref.kind).length ? "pick…" : "none defined"}</option>
          {#each namesFor(clause.ref.kind) as name}<option value={name}>{name}</option>{/each}
        </select>
      {:else if needsValue(clause.op)}
        <OperandInput bind:value={clause.value} {vocab} />
      {/if}

      <button class="rx" onclick={() => removeClause(i)} aria-label="Remove condition">×</button>

      {#if clause.ref.kind === "flag" && !namesFor("flag").length}
        <span class="nudge">No AI senses yet — add one in the system's <b>AI senses</b> panel, then reference it here.</span>
      {/if}
    </div>
  {/each}

  <button class="addc" onclick={addClause}>＋ add condition</button>
</div>

<style>
  .cond {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .ch {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .lbl {
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--muted);
  }
  .mode {
    display: inline-flex;
    background: var(--bg-subtle);
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    padding: 2px;
  }
  .mode button {
    font-size: 12.5px;
    font-weight: 600;
    color: var(--muted);
    background: none;
    border: none;
    padding: 2px 8px;
    border-radius: 4px;
    cursor: pointer;
  }
  .mode button.cur {
    background: var(--bg);
    color: var(--accent);
  }
  .sum {
    margin-left: auto;
    font-family: var(--font-mono);
    font-size: 13px;
    color: var(--muted);
  }
  .clause {
    display: flex;
    align-items: center;
    gap: 5px;
    flex-wrap: wrap;
  }
  .clause select {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--r-sm);
    color: var(--text);
    font: inherit;
    font-size: 14px;
    padding: 5px 7px;
  }
  .kind {
    color: var(--accent);
  }
  .op {
    color: var(--warning);
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
  .nudge {
    flex-basis: 100%;
    font-size: 12.5px;
    color: var(--warning);
  }
  .nudge b {
    color: var(--text);
  }
  .addc {
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
  .addc:hover {
    background: var(--accent-soft);
    border-color: var(--accent);
  }
</style>
