<script>
  // The extra-field + operator + value controls a condition and an effect share, so new field types are added in one place.
  import { operatorLabel } from "../lib/engine/triggers.js";
  import { named } from "../lib/named.js";
  import SelectField from "./SelectField.svelte";
  import KeyCombo from "./KeyCombo.svelte";

  let { row, spec, vocab } = $props();

  const TEXTAREA_EXTRA = {
    query: "Describe in plain language what the narrator should recognise…",
    instruction: "What the narrator should weave into the next turn…",
  };
  const VOCAB_EXTRA = {
    resource: { vocab: "resource", placeholder: "resource…" },
    entity: { vocab: "entity", placeholder: "entity…" },
    item: { vocab: "item", placeholder: "item…" },
    questId: { vocab: "quest", placeholder: "quest…" },
  };
  const BOOL_OPTIONS = [
    { value: "true", label: "true" },
    { value: "false", label: "false" },
  ];

  // keep the row's current value selectable even if it isn't in the world's vocab list
  function withCurrent(list, current) {
    return [...new Set([current, ...(list ?? [])].filter((value) => value !== "" && value != null))];
  }
</script>

{#if spec.extra === "key"}
  <KeyCombo bind:value={row.key} options={vocab.key} placeholder="key name" />
{:else if VOCAB_EXTRA[spec.extra]}
  {@const cfg = VOCAB_EXTRA[spec.extra]}
  <SelectField variant="key" placeholder={cfg.placeholder} value={row[spec.extra]} options={withCurrent(vocab[cfg.vocab], row[spec.extra])} onchange={(v) => (row[spec.extra] = v)} />
{/if}

{#if TEXTAREA_EXTRA[spec.extra]}
  <textarea class="query" use:named bind:value={row[spec.extra]} rows="2" placeholder={TEXTAREA_EXTRA[spec.extra]}></textarea>
{:else}
  {#if spec.ops.length > 1}
    <SelectField variant="op" value={row.operator} options={spec.ops.map((op) => ({ value: op, label: operatorLabel(op) }))} onchange={(v) => (row.operator = v)} />
  {/if}
  {#if row.operator !== "toggle"}
    {#if spec.value === "boolean"}
      <SelectField variant="val" value={String(row.value)} options={BOOL_OPTIONS} onchange={(v) => (row.value = v === "true")} />
    {:else if spec.value === "number"}
      <input class="val num" type="number" use:named bind:value={row.value} />
    {:else if spec.value === "string" && spec.vocab}
      <SelectField variant="val" placeholder="pick…" value={row.value} options={withCurrent(vocab[spec.vocab], row.value)} onchange={(v) => (row.value = v)} />
    {:else if spec.value === "string"}
      <input class="val" use:named bind:value={row.value} placeholder="value" />
    {/if}
  {/if}
{/if}

<style>
  .query {
    flex: 1;
    min-width: 240px;
    resize: vertical;
    line-height: 1.5;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--r-sm);
    color: var(--text);
    font: inherit;
    font-size: 13.5px;
    padding: 6px 8px;
    outline: none;
  }
  .val {
    min-width: 120px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--r-sm);
    color: var(--text);
    font: inherit;
    font-size: 13.5px;
    padding: 6px 8px;
    outline: none;
  }
  .val.num {
    width: 90px;
    min-width: 0;
  }
  .query:focus,
  .val:focus {
    border-color: var(--accent);
  }
</style>
