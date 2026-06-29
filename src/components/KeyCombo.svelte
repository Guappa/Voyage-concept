<script module>
  let seq = 0;
</script>

<script>
  // Free-text key field with a styled, filtered suggestion list, replacing the native datalist that overflowed the screen.
  let { value = $bindable(""), options = [], placeholder = "" } = $props();

  const fieldName = `key-${++seq}`;
  let open = $state(false);

  const matches = $derived((options ?? []).filter((opt) => opt !== value && opt.toLowerCase().includes((value ?? "").toLowerCase())).slice(0, 50));

  function pick(opt) {
    value = opt;
    open = false;
  }
</script>

<div class="combo">
  <input
    class="key"
    name={fieldName}
    bind:value
    {placeholder}
    autocomplete="off"
    onfocus={() => (open = true)}
    oninput={() => (open = true)}
    onblur={() => (open = false)}
    onkeydown={(e) => e.key === "Escape" && (open = false)}
  />
  {#if open && matches.length}
    <ul class="menu">
      {#each matches as opt}
        <li>
          <button
            type="button"
            title={opt}
            onmousedown={(e) => {
              e.preventDefault();
              pick(opt);
            }}>{opt}</button
          >
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .combo {
    position: relative;
    display: inline-block;
  }
  .key {
    width: 160px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--r-sm);
    color: var(--text);
    font: inherit;
    font-family: var(--font-mono);
    font-size: 13.5px;
    padding: 6px 8px;
    outline: none;
  }
  .key:focus {
    border-color: var(--accent);
  }
  .menu {
    position: absolute;
    top: calc(100% + 3px);
    left: 0;
    z-index: 5;
    width: max-content;
    min-width: 100%;
    max-width: 280px;
    max-height: 200px;
    overflow-y: auto;
    list-style: none;
    margin: 0;
    padding: 4px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--r-sm);
    box-shadow: var(--shadow-hover);
  }
  .menu button {
    width: 100%;
    text-align: left;
    background: none;
    border: none;
    color: var(--text);
    font-family: var(--font-mono);
    font-size: 13px;
    padding: 6px 8px;
    border-radius: var(--r-sm);
    cursor: pointer;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .menu button:hover {
    background: var(--accent-soft);
    color: var(--accent);
  }
</style>
