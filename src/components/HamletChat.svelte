<script>
  import { chat } from "../lib/store.svelte.js";

  let draft = $state("");
  let guided = $state(true);
  let scroller;

  // canned so the drawer reads like a real thread without wiring to any model
  const REPLY =
    "In the live studio I'd take that and draft it straight into your world: a premise, a system, a cast, or a revision. This concept is a non-functional illustration, so nothing here is generated for real yet.";

  function send() {
    const text = draft.trim();
    if (!text) return;
    chat.messages = [...chat.messages, { role: "user", text }, { role: "hamlet", text: REPLY }];
    draft = "";
    requestAnimationFrame(() => scroller?.scrollTo(0, scroller.scrollHeight));
  }
</script>

{#if chat.open}
  <div class="scrim" onclick={() => (chat.open = false)} aria-hidden="true"></div>
{/if}

<aside class="drawer" class:open={chat.open} aria-label="Hamlet world-building assistant" aria-hidden={!chat.open} inert={!chat.open}>
  <header>
    <span class="who"><span class="dot" aria-hidden="true"></span>Hamlet</span>
    <button class="x" onclick={() => (chat.open = false)} aria-label="Close chat">×</button>
  </header>

  <div class="thread" bind:this={scroller}>
    {#if chat.messages.length === 0}
      <div class="empty">
        <div class="hello">
          <img class="avatar" src="/hamlet.webp" alt="Hamlet portrait" />
          <div class="hbubble">
            <span class="tag">Hamlet</span>
            <p>Welcome to the demo! I'm Hamlet. Ask me anything, or just tell me to build something and I'll take it from there.</p>
          </div>
        </div>
      </div>
    {:else}
      {#each chat.messages as msg}
        {#if msg.role === "hamlet"}
          <div class="hello">
            <img class="avatar" src="/hamlet.webp" alt="Hamlet portrait" />
            <div class="hbubble">
              <span class="tag">Hamlet</span>
              <p>{msg.text}</p>
            </div>
          </div>
        {:else}
          <div class="hello me">
            <div class="ububble"><p>{msg.text}</p></div>
            <div class="uavatar" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-5 0-9 2.5-9 6v2h18v-2c0-3.5-4-6-9-6Z" /></svg>
            </div>
          </div>
        {/if}
      {/each}
    {/if}
  </div>

  <form
    class="composer"
    onsubmit={(e) => {
      e.preventDefault();
      send();
    }}
  >
    <textarea bind:value={draft} rows="2" placeholder="Ask for a premise, system, cast, conflict, or revision." onkeydown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
    ></textarea>
    <div class="composer__row">
      <button type="button" class="mode" class:on={guided} onclick={() => (guided = !guided)}>▦ {guided ? "Guided" : "Freeform"}</button>
      <button type="submit" class="up" aria-label="Send" disabled={!draft.trim()}>↑</button>
    </div>
  </form>
</aside>

<style>
  .scrim {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    z-index: 50;
  }
  .drawer {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: 400px;
    max-width: 92vw;
    z-index: 51;
    display: flex;
    flex-direction: column;
    background: var(--sidebar);
    border-left: 1px solid var(--border-subtle);
    box-shadow: var(--shadow-hover);
    transform: translateX(100%);
    transition: transform 0.2s ease;
  }
  .drawer.open {
    transform: translateX(0);
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    border-bottom: 1px solid var(--border-subtle);
  }
  .who {
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: var(--font-display);
    font-weight: 900;
    font-size: var(--fs-md);
    color: var(--heading);
  }
  .dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--success);
  }
  .x {
    background: none;
    border: none;
    color: var(--muted);
    font-size: var(--fs-xl);
    line-height: 1;
    cursor: pointer;
  }
  .x:hover {
    color: var(--text);
  }
  .thread {
    flex: 1;
    overflow-y: auto;
    padding: 18px 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .empty {
    margin: 0;
  }
  .hello {
    display: flex;
    align-items: flex-end;
    gap: 9px;
  }
  .avatar {
    width: 42px;
    height: 42px;
    flex: 0 0 auto;
    border-radius: 50%;
    border: 2px solid var(--border);
    object-fit: cover;
  }
  .hbubble {
    position: relative;
    max-width: 82%;
    background: var(--bg-subtle);
    border: 1px solid var(--border-subtle);
    border-radius: 16px 16px 16px 4px;
    padding: 9px 13px;
  }
  /* small tail toward the avatar, the received-message look */
  .hbubble::before {
    content: "";
    position: absolute;
    left: -5px;
    bottom: 7px;
    width: 10px;
    height: 10px;
    background: var(--bg-subtle);
    border-left: 1px solid var(--border-subtle);
    border-bottom: 1px solid var(--border-subtle);
    transform: rotate(45deg);
  }
  .hbubble p {
    color: var(--text);
    font-size: var(--fs-sm);
    line-height: 1.55;
  }
  .hello.me {
    justify-content: flex-end;
  }
  .uavatar {
    width: 42px;
    height: 42px;
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    border-radius: 50%;
    border: 2px solid var(--border);
    background: var(--bg);
    color: var(--muted);
  }
  .uavatar svg {
    width: 24px;
    height: 24px;
  }
  .ububble {
    position: relative;
    max-width: 82%;
    background: var(--accent-soft);
    border-radius: 16px 16px 4px 16px;
    padding: 9px 13px;
  }
  .ububble::before {
    content: "";
    position: absolute;
    right: -4px;
    bottom: 7px;
    width: 10px;
    height: 10px;
    background: var(--accent-soft);
    transform: rotate(45deg);
  }
  .ububble p {
    color: var(--text);
    font-size: var(--fs-sm);
    line-height: 1.55;
  }
  .tag {
    display: block;
    font-size: var(--fs-xs);
    font-weight: 700;
    color: var(--accent);
    margin-bottom: 3px;
  }
  .composer {
    border-top: 1px solid var(--border-subtle);
    padding: 12px;
  }
  .composer textarea {
    width: 100%;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    padding: 10px 12px;
    color: var(--text);
    font: inherit;
    font-size: var(--fs-sm);
    resize: none;
    outline: none;
  }
  .composer textarea:focus {
    border-color: var(--accent);
  }
  .composer__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 8px;
  }
  .mode {
    background: var(--bg);
    border: 1px solid var(--border);
    color: var(--muted);
    border-radius: 20px;
    padding: 5px 12px;
    font-size: var(--fs-xs);
    font-weight: 600;
    cursor: pointer;
  }
  .mode.on {
    color: var(--accent);
    border-color: var(--accent);
  }
  .up {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    border: none;
    background: var(--accent);
    color: var(--on-link);
    font-size: var(--fs-md);
    cursor: pointer;
  }
  .up:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
</style>
