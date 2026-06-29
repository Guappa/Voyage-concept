<script>
  // CodeMirror is heavy and only some views need it, so the editor module loads on first render instead of riding in the main bundle.
  let { value = $bindable(""), ...rest } = $props();
  let Editor = $state(null);
  import("./CodeEditor.svelte").then((module) => (Editor = module.default));
</script>

{#if Editor}
  <Editor bind:value {...rest} />
{:else}
  <div class="loading">Loading editor…</div>
{/if}

<style>
  .loading {
    padding: 16px;
    font-size: 13.5px;
    color: var(--muted);
    background: var(--code);
    border-top: 1px solid var(--border-subtle);
  }
</style>
