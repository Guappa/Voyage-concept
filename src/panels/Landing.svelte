<script>
  import { view } from "../lib/store.svelte.js";

  const pillars = [
    {
      id: "systems",
      icon: "🎲",
      title: "Modular game systems",
      body: "Define typed components and the events that act on them. Author the logic with no code, or flip a switch and write it as a sandboxed script. The engine runs it as a real mechanic.",
    },
    {
      id: "ui-builder",
      icon: "🎛️",
      title: "Custom in-game UI",
      body: "Build the HUD and the Character, Journal, and Map screens from the same components. Drag on desktop, tap on mobile, and turn a stat bar into emotes if you want a different feel.",
    },
    {
      id: "story-overview",
      icon: "🌍",
      title: "A simpler world editor",
      body: "Every world section, the way it works today, distilled to the fields that matter, with the deeper options a click away and a short note on what each one does.",
    },
  ];

  // placeholder account library; the picker mirrors the studio start screen without loading real projects
  const worlds = [
    { id: "fq1V8nXpK2a", name: "Emberfall Reaches", glyph: "🜂", color: "linear-gradient(140deg,#b3553f,#5e2a22)" },
    { id: "Hk7rWmA0sLb", name: "The Hollow Crown", glyph: "👑", color: "linear-gradient(140deg,#a98a3f,#4d3c18)" },
    { id: "Td9xQ4pVnZc", name: "Tidewright Saga", glyph: "🌊", color: "linear-gradient(140deg,#3f7fb3,#1d3a52)" },
    { id: "Nx2pLm8KwRd", name: "Neon Divide", glyph: "🌃", color: "linear-gradient(140deg,#8a3fb3,#3a1d52)" },
    { id: "Sm5tYbQ1xHe", name: "Saltmarsh Errant", glyph: "⚓", color: "linear-gradient(140deg,#4f9e87,#1f4036)" },
    { id: "Ir3kPn9VwMf", name: "Ironreach", glyph: "🛡️", color: "linear-gradient(140deg,#6b7280,#33373d)" },
    { id: "Vh8cTr2LpNg", name: "Verdant Hollow", glyph: "🌿", color: "linear-gradient(140deg,#5aa53f,#274d1d)" },
    { id: "Dm6wJk0QzAh", name: "Duskmoor", glyph: "🌑", color: "linear-gradient(140deg,#4a4a6b,#222236)" },
  ];
  const mods = [
    { id: "So4nBv7XtUi", name: "Survival Overhaul", glyph: "🔧", color: "linear-gradient(140deg,#b07a3f,#523819)" },
    { id: "Fp1rGc5MzWj", name: "Faction Politics+", glyph: "⚔️", color: "linear-gradient(140deg,#a13f4f,#4d1d24)" },
  ];

  let tab = $state("worlds");
  let selected = $state(worlds[0].id);

  const list = $derived(tab === "worlds" ? worlds : mods);

  function open(id) {
    view.section = id;
  }
</script>

<div class="land">
  <div class="hero">
    <span class="mk">✦</span>
    <span class="tag">Design concept</span>
    <h1>Build the kind of world you imagine.</h1>
    <p class="lede">
      A working prototype of a more flexible Voyage creator: replaceable game systems, creator-built interfaces, and a world editor that a first-timer can reason through. An exploration of the modular
      engine roadmap, here for the team to poke at.
    </p>
    <div class="cta">
      <button class="primary" onclick={() => open("systems")}>Open the creator →</button>
      <button class="ghost" onclick={() => open("story-overview")}>Start with a world</button>
    </div>
  </div>

  <section class="studio">
    <div class="studio__head">
      <span class="kicker">Voyage Studio</span>
      <h2>Where should Studio start?</h2>
      <p>Pick an existing world or mod to edit, or create a fresh one from a blank session.</p>
    </div>
    <div class="studio__cols">
      <div class="scol">
        <span class="scol__label">Create</span>
        <h3 class="scol__title">Start new content</h3>
        <button class="create" onclick={() => open("overview")}>
          <span class="create__ic">+</span>
          <span class="create__txt"><b>New world</b><span>Open a clean chat and build from a new premise.</span></span>
          <span class="chev">›</span>
        </button>
        <button class="create" onclick={() => open("overview")}>
          <span class="create__ic">🔧</span>
          <span class="create__txt"><b>New mod</b><span>Build reusable changes that other worlds can attach.</span></span>
          <span class="chev">›</span>
        </button>
      </div>
      <div class="scol">
        <span class="scol__label">Continue</span>
        <h3 class="scol__title">Choose a world or mod</h3>
        <div class="tabs">
          <button class:on={tab === "worlds"} onclick={() => (tab = "worlds")}>🌐 Worlds {worlds.length}</button>
          <button class:on={tab === "mods"} onclick={() => (tab = "mods")}>🔧 Mods {mods.length}</button>
        </div>
        <div class="wlist">
          {#each list as w}
            <button class="item" class:sel={selected === w.id} onclick={() => (selected = w.id)}>
              <span class="thumb" style="background:{w.color}">{w.glyph}</span>
              <span class="meta"><b>{w.name}</b><span class="wid">{w.id}</span></span>
              {#if selected === w.id}<span class="check">✓</span>{:else}<span class="chev">›</span>{/if}
            </button>
          {/each}
        </div>
      </div>
    </div>
  </section>

  <div class="pillars">
    {#each pillars as p}
      <button class="pillar" onclick={() => open(p.id)}>
        <span class="ic">{p.icon}</span>
        <h3>{p.title}</h3>
        <p>{p.body}</p>
        <span class="go">Explore →</span>
      </button>
    {/each}
  </div>

  <div class="how">
    <h2>How to read this</h2>
    <ul>
      <li><b>It is a concept, not a build.</b> Nothing here is wired to a real engine; the live preview is a faithful simulation.</li>
      <li><b>Everything is editable.</b> Change a component, a rule, a field, or a widget and watch it update. Your work is saved in this browser.</li>
      <li><b>Two depths everywhere.</b> A no-code path for anyone, an advanced path (scripts, deeper fields) for power users.</li>
    </ul>
  </div>
</div>

<style>
  .land {
    margin: 0 auto;
  }
  .hero {
    text-align: center;
    padding: 36px 0 30px;
  }
  .mk {
    display: inline-grid;
    place-items: center;
    width: 54px;
    height: 54px;
    border-radius: 14px;
    background: linear-gradient(140deg, #79b8ff, #3f6fb0);
    color: var(--on-link);
    font-weight: 700;
    font-size: 30.5px;
    margin-bottom: 14px;
  }
  .tag {
    display: block;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 10px;
  }
  h1 {
    font-size: 40px;
    letter-spacing: -0.4px;
    margin-bottom: 14px;
  }
  .lede {
    color: var(--muted);
    font-size: 18.5px;
    line-height: 1.6;
    max-width: 640px;
    margin: 0 auto 22px;
  }
  .cta {
    display: flex;
    gap: 10px;
    justify-content: center;
    flex-wrap: wrap;
  }
  .primary {
    background: var(--accent);
    color: var(--on-link);
    border: none;
    border-radius: var(--r-md);
    font-size: 16.5px;
    font-weight: 650;
    padding: 11px 20px;
    cursor: pointer;
  }
  .primary:hover {
    filter: brightness(1.07);
  }
  .ghost {
    background: var(--bg);
    border: 1px solid var(--border);
    color: var(--text);
    border-radius: var(--r-md);
    font-size: 16.5px;
    font-weight: 600;
    padding: 11px 18px;
    cursor: pointer;
  }
  .ghost:hover {
    border-color: var(--muted);
  }
  .pillars {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
    margin: 10px 0 34px;
  }
  .pillar {
    text-align: left;
    background: var(--bg-subtle);
    border: 1px solid var(--border-subtle);
    border-radius: var(--r-lg);
    box-shadow: var(--shadow-card);
    padding: 20px 18px;
    cursor: pointer;
    transition: 0.16s;
    color: var(--text);
  }
  .pillar:hover {
    box-shadow: var(--shadow-hover);
    border-color: var(--border);
    transform: translateY(-2px);
  }
  .ic {
    display: inline-grid;
    place-items: center;
    width: 38px;
    height: 38px;
    border-radius: var(--r-md);
    background: var(--accent-soft);
    color: var(--accent);
    font-size: 22.5px;
    margin-bottom: 12px;
  }
  .pillar h3 {
    font-size: 19px;
    margin-bottom: 8px;
  }
  .pillar p {
    color: var(--muted);
    font-size: 15.5px;
    line-height: 1.55;
    margin-bottom: 14px;
  }
  .go {
    font-size: 15px;
    font-weight: 600;
    color: var(--accent);
  }
  .how {
    background: var(--bg-subtle);
    border: 1px solid var(--border-subtle);
    border-radius: var(--r-lg);
    padding: 22px 24px;
  }
  .how h2 {
    font-size: 19px;
    margin-bottom: 12px;
  }
  .how ul {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .how li {
    font-size: 16px;
    color: var(--muted);
    line-height: 1.55;
    padding-left: 18px;
    position: relative;
  }
  .how li::before {
    content: "→";
    position: absolute;
    left: 0;
    color: var(--accent);
  }
  .how b {
    color: var(--text);
  }
  .studio {
    background: var(--bg-subtle);
    border: 1px solid var(--border-subtle);
    border-radius: var(--r-lg);
    box-shadow: var(--shadow-card);
    padding: 26px 28px;
    margin-bottom: 34px;
  }
  .studio__head {
    margin-bottom: 22px;
  }
  .kicker {
    display: block;
    font-size: 12.5px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 8px;
  }
  .studio__head h2 {
    font-family: var(--font-display);
    font-weight: 900;
    font-size: 30px;
    margin-bottom: 8px;
  }
  .studio__head p {
    color: var(--muted);
    font-size: 16.5px;
  }
  .studio__cols {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 26px;
  }
  .scol__label {
    display: block;
    font-size: 12.5px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 5px;
  }
  .scol__title {
    font-size: 19px;
    margin-bottom: 14px;
  }
  .create {
    display: flex;
    align-items: center;
    gap: 14px;
    width: 100%;
    text-align: left;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    padding: 16px;
    margin-bottom: 12px;
    cursor: pointer;
    color: var(--text);
    transition: 0.14s;
  }
  .create:hover {
    border-color: var(--muted);
    transform: translateY(-1px);
  }
  .create__ic {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: var(--bg-subtle);
    border: 1px solid var(--border);
    font-size: 22px;
  }
  .create__txt {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .create__txt b {
    font-size: 16.5px;
  }
  .create__txt span {
    color: var(--muted);
    font-size: 14.5px;
    line-height: 1.45;
  }
  .chev {
    color: var(--muted);
    font-size: 20px;
  }
  .tabs {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
  }
  .tabs button {
    background: var(--bg);
    border: 1px solid var(--border);
    color: var(--muted);
    border-radius: 20px;
    padding: 7px 14px;
    font-size: 14.5px;
    font-weight: 600;
    cursor: pointer;
  }
  .tabs button.on {
    background: var(--accent-soft);
    border-color: var(--accent);
    color: var(--accent);
  }
  .wlist {
    display: flex;
    flex-direction: column;
    gap: 2px;
    max-height: 296px;
    overflow-y: auto;
    padding-right: 4px;
  }
  .item {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    text-align: left;
    background: none;
    border: 1px solid transparent;
    border-radius: var(--r-md);
    padding: 9px 10px;
    cursor: pointer;
    color: var(--text);
  }
  .item:hover {
    background: var(--bg);
  }
  .item.sel {
    background: var(--bg);
    border-color: var(--accent);
  }
  .thumb {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    width: 38px;
    height: 38px;
    border-radius: var(--r-md);
    font-size: 19px;
  }
  .meta {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .meta b {
    font-size: 15.5px;
  }
  .wid {
    font-size: 13px;
    color: var(--muted);
    font-family: var(--font-mono);
  }
  .check {
    color: var(--accent);
    font-size: 17px;
    font-weight: 700;
  }
  @container page (max-width: 760px) {
    .pillars {
      grid-template-columns: 1fr;
    }
    .studio__cols {
      grid-template-columns: 1fr;
    }
    h1 {
      font-size: 32px;
    }
  }
</style>
