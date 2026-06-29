<script>
  import { store, view, ui } from "../lib/store.svelte.js";
  import { SIDEBAR, SECTIONS } from "../lib/sections.js";

  let { open, onnavigate } = $props();

  function go(id) {
    view.section = id;
    onnavigate?.();
  }

  // a small count next to content sections so the creator sees how full each one is at a glance
  function count(id) {
    if (id === "events") return Object.keys(store.project.triggers ?? {}).length || null;
    const section = SECTIONS[id];
    if (!section || section.kind !== "record") return null;
    return Object.keys(store.project[section.key] ?? {}).length;
  }

  const activeRoot = $derived(view.section === "build" ? "systems" : view.section);

  // search narrows the nav so a creator can jump to any section by name
  const groups = $derived.by(() => {
    const query = ui.search.trim().toLowerCase();
    if (!query) return SIDEBAR;
    return SIDEBAR.map((grp) => ({ ...grp, items: grp.items.filter((item) => item.label.toLowerCase().includes(query)) })).filter((grp) => grp.items.length > 0);
  });
</script>

<nav class="side" class:open id="sidebar-nav" aria-label="World sections">
  {#each groups as grp}
    <div class="grp">
      <h6>{grp.group}</h6>
      <div class="lyr">{grp.note}</div>
      {#each grp.items as item}
        <button class="nav" class:cur={activeRoot === item.id} aria-current={activeRoot === item.id ? "page" : undefined} onclick={() => go(item.id)}>
          <span class="ic" aria-hidden="true">{item.icon}</span>
          <span class="lbl">{item.label}</span>
          {#if count(item.id) !== null}<span class="badge">{count(item.id)}</span>{/if}
        </button>
      {/each}
    </div>
  {/each}
  {#if groups.length === 0}<p class="empty">No sections match “{ui.search}”.</p>{/if}
</nav>

<style>
  .side {
    width: 262px;
    flex-shrink: 0;
    background: var(--sidebar);
    border-right: 1px solid var(--border-subtle);
    padding: 20px 14px;
    overflow-y: auto;
  }
  .grp {
    margin-bottom: 18px;
  }
  h6 {
    font-size: var(--fs-xs);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text);
    margin: 0 10px 2px;
    font-weight: 700;
  }
  .lyr {
    font-size: 13.5px;
    color: var(--muted);
    margin: 0 10px 9px;
  }
  .nav {
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 9px 11px;
    border-radius: var(--r-sm);
    color: var(--text);
    font-size: var(--fs-sm);
    cursor: pointer;
    margin-bottom: 1px;
    width: 100%;
    background: none;
    border: none;
    text-align: left;
  }
  .nav:hover {
    background: var(--bg-subtle);
  }
  .nav.cur {
    background: var(--accent-soft);
    color: var(--accent);
    font-weight: 600;
  }
  .ic {
    width: 18px;
    text-align: center;
    opacity: 0.85;
    font-size: var(--fs-sm);
  }
  .lbl {
    flex: 1;
  }
  .badge {
    font-size: 13px;
    font-weight: 700;
    color: var(--muted);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 0 7px;
  }
  .empty {
    color: var(--muted);
    font-size: var(--fs-sm);
    padding: 8px 11px;
  }
  @media (max-width: 860px) {
    .side {
      position: fixed;
      top: 0;
      bottom: 0;
      left: 0;
      z-index: 40;
      transform: translateX(-100%);
      transition: transform 0.18s ease;
      box-shadow: var(--shadow-hover);
    }
    .side.open {
      transform: translateX(0);
    }
  }
</style>
