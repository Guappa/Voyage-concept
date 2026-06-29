<script module>
  let seq = 0;
</script>

<script>
  // One styled select for every option list, so new fields get consistent look + a guaranteed name for free.
  let { value, onchange, options = [], placeholder = "", variant = "", name } = $props();

  const fallbackName = `select-${++seq}`;
  const fieldName = $derived(name ?? fallbackName);
  const opts = $derived((options ?? []).map((opt) => (opt && typeof opt === "object" ? opt : { value: opt, label: opt })));
</script>

<select class="sf {variant}" name={fieldName} aria-label={placeholder || variant || fieldName} {value} onchange={(e) => onchange?.(e.target.value)}>
  {#if placeholder}<option value="" disabled>{placeholder}</option>{/if}
  {#each opts as opt}<option value={opt.value}>{opt.label}</option>{/each}
</select>

<style>
  .sf {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--r-sm);
    color: var(--text);
    font: inherit;
    font-size: 13.5px;
    padding: 6px 8px;
    outline: none;
  }
  .sf:focus {
    border-color: var(--accent);
  }
  .type {
    color: var(--accent);
  }
  .op {
    color: var(--warning);
  }
  .target {
    color: var(--success);
  }
  .key {
    font-family: var(--font-mono);
    width: 140px;
  }
  .val {
    min-width: 120px;
  }
</style>
