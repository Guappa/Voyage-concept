<script>
  import { store, view, persist, initWorld } from "./lib/store.svelte.js";
  import { SECTIONS } from "./lib/sections.js";
  import Appbar from "./components/Appbar.svelte";
  import Sidebar from "./components/Sidebar.svelte";
  import HamletChat from "./components/HamletChat.svelte";
  import Landing from "./panels/Landing.svelte";
  import Overview from "./panels/Overview.svelte";
  import ModLibrary from "./panels/ModLibrary.svelte";
  import SystemsLibrary from "./panels/SystemsLibrary.svelte";
  import BuildSystem from "./panels/BuildSystem.svelte";
  import UIBuilder from "./panels/UIBuilder.svelte";
  import Events from "./panels/Events.svelte";
  import SectionEditor from "./panels/SectionEditor.svelte";

  let drawerOpen = $state(false);

  // preload the example world on first visit (no-op if the visitor already has a saved project)
  $effect(() => {
    initWorld();
  });

  // one serialize per change tracks deep edits and feeds the debounced write, so large worlds stay responsive
  $effect(() => {
    persist(JSON.stringify(store.project));
  });

  const section = $derived(SECTIONS[view.section]);

  function navigate() {
    drawerOpen = false;
  }
</script>

<a class="skip-link" href="#main">Skip to content</a>
<div class="app">
  <Appbar onmenu={() => (drawerOpen = !drawerOpen)} menuOpen={drawerOpen} />
  <div class="body">
    <Sidebar open={drawerOpen} onnavigate={navigate} />
    {#if drawerOpen}<div class="scrim" onclick={() => (drawerOpen = false)} aria-hidden="true"></div>{/if}
    <main class="main" id="main" tabindex="-1">
      <div class="page">
        {#if view.section === "home"}
          <Landing />
        {:else if view.section === "overview"}
          <Overview />
        {:else if view.section === "mods"}
          <ModLibrary />
        {:else if view.section === "systems"}
          <SystemsLibrary />
        {:else if view.section === "build"}
          <BuildSystem />
        {:else if view.section === "ui-builder"}
          <UIBuilder />
        {:else if view.section === "events"}
          <Events />
        {:else if section}
          <SectionEditor id={view.section} />
        {:else}
          <p class="muted">Pick a section.</p>
        {/if}
      </div>
    </main>
  </div>
  <footer class="foot">
    <b>Design concept</b>
  </footer>
  <HamletChat />
</div>

<style>
  .app {
    height: 100vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .body {
    flex: 1;
    display: flex;
    min-height: 0;
    position: relative;
  }
  .main {
    flex: 1;
    min-width: 0;
    overflow-y: auto;
    padding: 26px 34px 48px;
  }
  /* container queries let panels reflow to their real content width, independent of the sidebar */
  .page {
    width: 100%;
    max-width: 1440px;
    margin: 0 auto;
    container-type: inline-size;
    container-name: page;
  }
  .main:focus-visible {
    outline: none;
  }
  .muted {
    color: var(--muted);
  }
  .foot {
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 14px 34px;
    background: var(--sidebar);
    border-top: 1px solid var(--border-subtle);
    color: var(--muted);
    font-size: var(--fs-xs);
    line-height: 1.5;
  }
  .foot b {
    color: var(--text);
  }
  .scrim {
    display: none;
  }
  @media (max-width: 860px) {
    .main {
      padding: 18px 16px 36px;
    }
    .scrim {
      display: block;
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 30;
    }
  }
</style>
