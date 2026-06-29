<script>
  import { store, view, ui, chat, saveState, exportProject, importProject, resetProject, loadLarion } from "../lib/store.svelte.js";

  let { onmenu, menuOpen = false } = $props();
  let fileInput;

  function download() {
    const blob = new Blob([exportProject()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${store.project.meta?.name ?? "world"}.creator.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function upload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      importProject(await file.text());
    } catch {
      alert("That file could not be read as a creator project.");
    }
    event.target.value = "";
  }

  function reset() {
    if (confirm("Reset to an empty world? Your local changes will be lost. Use Import Larion to reload the example.")) resetProject();
  }

  async function importLarion() {
    if (confirm("Load the Larion example world? This replaces the current world.")) await loadLarion();
  }
</script>

<header class="appbar">
  <button class="menu" onclick={onmenu} aria-label="Toggle navigation" aria-expanded={menuOpen} aria-controls="sidebar-nav">☰</button>
  <button class="logo" onclick={() => (view.section = "home")}><span class="mk" aria-hidden="true">✦</span><b>Voyage Creator</b><span class="tag">concept</span></button>
  <span class="world">{store.project.meta?.name}</span>
  {#if saveState.savedAt}<span class="saved">✓ Saved</span>{/if}
  <form class="search" role="search" onsubmit={(e) => e.preventDefault()}>
    <label class="vh" for="creator-search">Search sections</label>
    <span class="search__icon" aria-hidden="true">⌕</span>
    <input id="creator-search" type="search" placeholder="Search sections…" bind:value={ui.search} autocomplete="off" />
  </form>
  <button class="btn" onclick={() => fileInput.click()}>Import</button>
  <button class="btn" onclick={importLarion}>Import Larion</button>
  <button class="btn" onclick={download}>Export</button>
  <button class="btn" onclick={reset}>Reset</button>
  <button class="btn chat" class:on={chat.open} onclick={() => (chat.open = !chat.open)} aria-pressed={chat.open} aria-label="Toggle Hamlet assistant">✦ Hamlet</button>
  <input bind:this={fileInput} type="file" accept="application/json" onchange={upload} hidden />
</header>

<style>
  .appbar {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 12px 20px;
    background: var(--sidebar);
    border-bottom: 1px solid var(--border-subtle);
  }
  .vh {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
  .menu {
    display: none;
    background: none;
    border: 1px solid var(--border);
    color: var(--text);
    border-radius: var(--r-sm);
    padding: 5px 11px;
    cursor: pointer;
    font-size: var(--fs-md);
  }
  .logo {
    display: flex;
    align-items: center;
    gap: 9px;
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
  }
  .mk {
    width: 27px;
    height: 27px;
    border-radius: 8px;
    display: grid;
    place-items: center;
    background: linear-gradient(140deg, #79b8ff, #3f6fb0);
    color: var(--on-link);
    font-weight: 700;
    font-size: 16.5px;
  }
  .logo b {
    font-family: var(--font-display);
    font-weight: 900;
    font-size: var(--fs-md);
    letter-spacing: 0.01em;
    color: var(--heading);
  }
  .tag {
    font-size: 12.5px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--muted);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 2px 8px;
  }
  .world {
    color: var(--muted);
    font-size: var(--fs-sm);
  }
  .saved {
    font-size: var(--fs-xs);
    font-weight: 600;
    color: var(--success);
    background: color-mix(in srgb, var(--success) 12%, transparent);
    border-radius: 20px;
    padding: 3px 9px;
  }
  .search {
    flex: 1;
    max-width: 420px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    padding: 0 12px;
  }
  .search:focus-within {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 22%, transparent);
  }
  .search__icon {
    color: var(--muted);
    font-size: var(--fs-md);
  }
  .search input {
    flex: 1;
    background: none;
    border: none;
    outline: none;
    color: var(--text);
    font: inherit;
    font-size: var(--fs-sm);
    padding: 9px 0;
  }
  .search input::placeholder {
    color: var(--muted);
  }
  .btn {
    font-size: var(--fs-sm);
    font-weight: 600;
    padding: 8px 14px;
    border-radius: var(--r-md);
    cursor: pointer;
    border: 1px solid var(--border);
    background: var(--bg);
    color: var(--text);
    transition: 0.13s;
  }
  .btn:hover {
    border-color: var(--muted);
  }
  .chat.on {
    background: var(--accent-soft);
    border-color: var(--accent);
    color: var(--accent);
  }
  @media (max-width: 860px) {
    .appbar {
      flex-wrap: wrap;
    }
    .menu {
      display: block;
    }
    .world,
    .saved {
      display: none;
    }
    .search {
      order: 5;
      flex-basis: 100%;
      max-width: none;
      margin: 0;
    }
  }
</style>
