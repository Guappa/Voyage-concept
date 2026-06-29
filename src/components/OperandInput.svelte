<script>
  import { isRefOperand, isExprOperand, validExpr, VALUE_REF_KINDS } from "../lib/engine/operand.js";

  let { value = $bindable(), vocab, placeholder = "value" } = $props();

  const mode = $derived(isExprOperand(value) ? "expr" : isRefOperand(value) ? "ref" : "literal");
  const refKind = $derived(isRefOperand(value) ? value.ref.kind : VALUE_REF_KINDS[0].kind);
  const names = $derived(vocab?.[refKind] ?? []);
  // Formulas resolve identifiers as stats, so validity is checked against the stat vocabulary.
  const exprOk = $derived(!isExprOperand(value) || value.expr === "" || validExpr(value.expr, vocab?.component ?? []));

  function setMode(next) {
    if (next === "literal") value = "";
    else if (next === "ref") value = { ref: { kind: VALUE_REF_KINDS[0].kind, name: "" } };
    else value = { expr: "" };
  }

  function setKind(kind) {
    value = { ref: { kind, name: "" } };
  }
</script>

<div class="operand">
  <div class="modes" role="tablist" aria-label="Value source">
    <button class:cur={mode === "literal"} onclick={() => setMode("literal")} title="A fixed number">123</button>
    <button class:cur={mode === "ref"} onclick={() => setMode("ref")} title="Another stat's value">stat</button>
    <button class:cur={mode === "expr"} onclick={() => setMode("expr")} title="A formula over stats">ƒx</button>
  </div>

  {#if mode === "literal"}
    <input class="val" value={value ?? ""} onchange={(e) => (value = e.target.value)} {placeholder} aria-label="Literal value" />
  {:else if mode === "ref"}
    {#if VALUE_REF_KINDS.length > 1}
      <select class="kind" value={refKind} onchange={(e) => setKind(e.target.value)} aria-label="Reference kind">
        {#each VALUE_REF_KINDS as k}<option value={k.kind}>{k.label}</option>{/each}
      </select>
    {/if}
    <select class="name" value={value.ref.name} onchange={(e) => (value = { ref: { kind: refKind, name: e.target.value } })} aria-label="Referenced stat">
      <option value="" disabled>{names.length ? "pick…" : "none defined"}</option>
      {#each names as name}<option value={name}>{name}</option>{/each}
    </select>
  {:else}
    <input class="val expr" class:bad={!exprOk} value={value.expr} onchange={(e) => (value = { expr: e.target.value })} placeholder="e.g. Damage * 0.5" aria-label="Formula" />
  {/if}
</div>

<style>
  .operand {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    flex-wrap: wrap;
  }
  .modes {
    display: inline-flex;
    background: var(--bg-subtle);
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    padding: 2px;
  }
  .modes button {
    font-size: 12px;
    font-weight: 600;
    color: var(--muted);
    background: none;
    border: none;
    padding: 3px 7px;
    border-radius: 4px;
    cursor: pointer;
    font-family: var(--font-mono);
  }
  .modes button.cur {
    background: var(--bg);
    color: var(--accent);
  }
  .val,
  .name,
  .kind {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--r-sm);
    color: var(--text);
    font: inherit;
    font-size: 14px;
    padding: 5px 7px;
  }
  .val {
    width: 96px;
  }
  .val.expr {
    width: 150px;
    font-family: var(--font-mono);
  }
  .val.bad {
    border-color: var(--error);
  }
  .kind {
    color: var(--accent);
  }
</style>
