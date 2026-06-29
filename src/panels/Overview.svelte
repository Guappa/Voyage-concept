<script>
  import { siteMeta, persistSite } from "../lib/store.svelte.js";
  import { mockRating } from "../lib/site.js";

  let coverInput;
  let mdField;
  let tagDraft = $state("");

  $effect(() => {
    JSON.stringify(siteMeta);
    persistSite();
  });

  function uploadCover(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => (siteMeta.cover = reader.result);
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  function addTag() {
    const value = tagDraft.trim();
    if (!value || siteMeta.tags.length >= 10 || siteMeta.tags.includes(value)) return;
    siteMeta.tags = [...siteMeta.tags, value];
    tagDraft = "";
  }

  function removeTag(index) {
    siteMeta.tags = siteMeta.tags.filter((_, i) => i !== index);
  }

  // toolbar wraps the selection so the markdown box behaves like the studio's
  function wrap(before, after = before) {
    const element = mdField;
    const start = element.selectionStart;
    const end = element.selectionEnd;
    const value = siteMeta.markdown;
    siteMeta.markdown = value.slice(0, start) + before + value.slice(start, end) + after + value.slice(end);
    requestAnimationFrame(() => {
      element.focus();
      element.selectionStart = start + before.length;
      element.selectionEnd = end + before.length;
    });
  }

  function prefixLine(token) {
    const element = mdField;
    const start = element.selectionStart;
    const value = siteMeta.markdown;
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    siteMeta.markdown = value.slice(0, lineStart) + token + value.slice(lineStart);
  }

  function checkRating() {
    if (siteMeta.ratingChecksRemaining <= 0) return;
    siteMeta.rating = mockRating(siteMeta);
    siteMeta.ratingChecksRemaining -= 1;
  }
</script>

<div class="ov">
  <div class="cover" class:empty={!siteMeta.cover}>
    {#if siteMeta.cover}<img src={siteMeta.cover} alt="World cover" />{/if}
    <span class="cover__title">{siteMeta.name || "Untitled world"}</span>
  </div>
  <div class="cover__actions">
    {#if siteMeta.cover}<button class="btn" onclick={() => (siteMeta.cover = "")}>🗑 Remove cover</button>{/if}
    <button class="btn" onclick={() => coverInput.click()}>✎ Upload cover</button>
    <input bind:this={coverInput} type="file" accept="image/*" onchange={uploadCover} hidden />
  </div>

  <label class="fld">
    <span class="lbl">World name</span>
    <input type="text" bind:value={siteMeta.name} placeholder="Name your world" />
  </label>

  <label class="fld">
    <span class="lbl">Description</span>
    <textarea bind:value={siteMeta.description} maxlength="5000" rows="7" placeholder="The pitch a player reads before starting."></textarea>
    <span class="count">{siteMeta.description.length}/5000</span>
  </label>

  <div class="fld">
    <span class="lbl">Markdown description</span>
    <div class="mdbar" role="toolbar" aria-label="Markdown formatting">
      <button type="button" title="Heading" onclick={() => prefixLine("# ")}>#</button>
      <button type="button" title="Bold" class="b" onclick={() => wrap("**")}>B</button>
      <button type="button" title="Italic" class="i" onclick={() => wrap("*")}>I</button>
      <button type="button" title="Link" onclick={() => wrap("[", "](url)")}>URL</button>
      <button type="button" title="Numbered list" onclick={() => prefixLine("1. ")}>1.</button>
      <button type="button" title="Bullet list" onclick={() => prefixLine("- ")}>•</button>
      <button type="button" title="Divider" onclick={() => wrap("\n\n---\n\n", "")}>---</button>
    </div>
    <textarea bind:this={mdField} bind:value={siteMeta.markdown} rows="9" placeholder="Rich, formatted overview shown on the world page."></textarea>
  </div>

  <div class="fld">
    <span class="lbl">Tags</span>
    <div class="chips">
      {#each siteMeta.tags as tag, i}
        <span class="chip">{tag}<button type="button" onclick={() => removeTag(i)} aria-label={`Remove ${tag}`}>×</button></span>
      {/each}
    </div>
    <input value={tagDraft} oninput={(e) => (tagDraft = e.target.value)} onkeydown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())} placeholder="fantasy, adventure, etc." />
    <span class="count">{siteMeta.tags.length}/10 tags</span>
  </div>

  <div class="seg-row">
    <div class="fld">
      <span class="lbl">Type</span>
      <div class="seg">
        <button class:on={siteMeta.type === "world"} onclick={() => (siteMeta.type = "world")}>World</button>
        <button class:on={siteMeta.type === "mod"} onclick={() => (siteMeta.type = "mod")}>Mod</button>
      </div>
    </div>
    <div class="fld">
      <span class="lbl">Visibility</span>
      <div class="seg">
        <button class:on={siteMeta.visibility === "private"} onclick={() => (siteMeta.visibility = "private")}>Private</button>
        <button class:on={siteMeta.visibility === "unlisted"} onclick={() => (siteMeta.visibility = "unlisted")}>Unlisted</button>
      </div>
    </div>
  </div>

  <div class="card toggle-card">
    <div>
      <b>Allow remix publishing</b>
      <p>Players can always remix privately; this controls whether they can publish remixes.</p>
    </div>
    <button
      class="switch"
      class:on={siteMeta.allowRemix}
      role="switch"
      aria-checked={siteMeta.allowRemix}
      aria-label="Allow remix publishing"
      onclick={() => (siteMeta.allowRemix = !siteMeta.allowRemix)}><span></span></button
    >
  </div>

  <div class="card rating-card">
    <h3>ⓘ Check Rating</h3>
    <p>{siteMeta.name || "This world"} will be saved during the rating check.</p>
    <p class="muted">AI rating checks remaining today: {siteMeta.ratingChecksRemaining} of 50</p>
    <div class="rating-actions">
      <button class="btn primary" onclick={checkRating} disabled={siteMeta.ratingChecksRemaining <= 0}>Check rating</button>
      <button class="link">Full review</button>
    </div>

    {#if siteMeta.rating}
      <div class="rating-result">
        <span class="lbl">Current rating</span>
        <strong class="tier">{siteMeta.rating.overall}</strong>
        <ul>
          {#each Object.entries(siteMeta.rating.axes) as [axis, tier]}
            <li>{axis}: {tier}</li>
          {/each}
        </ul>
        <p class="note">{siteMeta.rating.note}</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .ov {
    max-width: 880px;
    margin: 0 auto;
  }
  .cover {
    position: relative;
    height: 180px;
    border-radius: var(--r-lg);
    overflow: hidden;
    border: 1px solid var(--border-subtle);
    background: linear-gradient(140deg, #2a2f3a, #1b1f27);
    box-shadow: var(--shadow-card);
    display: flex;
    align-items: flex-end;
  }
  .cover img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .cover.empty::after {
    content: "No cover image";
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    color: var(--muted);
    font-size: var(--fs-sm);
  }
  .cover__title {
    position: relative;
    z-index: 1;
    font-family: var(--font-display);
    font-weight: 900;
    font-size: 26px;
    color: #fff;
    padding: 16px 18px;
    text-shadow: 0 2px 12px rgba(0, 0, 0, 0.7);
  }
  .cover__actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    margin: 10px 0 22px;
  }
  .fld {
    display: block;
    margin-bottom: 18px;
  }
  .lbl {
    display: block;
    font-size: var(--fs-xs);
    font-weight: 600;
    color: var(--muted);
    margin-bottom: 6px;
  }
  input,
  textarea {
    width: 100%;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--r-sm);
    padding: 10px 12px;
    color: var(--text);
    font: inherit;
    font-size: var(--fs-base);
    outline: none;
    box-shadow: var(--shadow-card);
  }
  textarea {
    resize: vertical;
    line-height: 1.55;
  }
  input:focus,
  textarea:focus {
    border-color: var(--accent);
  }
  .count {
    display: block;
    text-align: right;
    font-size: var(--fs-xs);
    color: var(--muted);
    margin-top: 4px;
  }
  .mdbar {
    display: flex;
    gap: 2px;
    background: var(--bg-subtle);
    border: 1px solid var(--border);
    border-bottom: none;
    border-radius: var(--r-sm) var(--r-sm) 0 0;
    padding: 5px;
  }
  .mdbar button {
    min-width: 34px;
    padding: 5px 9px;
    background: none;
    border: none;
    color: var(--muted);
    border-radius: var(--r-sm);
    cursor: pointer;
    font-size: var(--fs-sm);
    font-weight: 600;
  }
  .mdbar button:hover {
    background: var(--bg);
    color: var(--text);
  }
  .mdbar .b {
    font-weight: 800;
  }
  .mdbar .i {
    font-style: italic;
  }
  .mdbar + textarea {
    border-radius: 0 0 var(--r-sm) var(--r-sm);
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 7px;
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: var(--fs-xs);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    background: var(--bg-subtle);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 4px 6px 4px 11px;
  }
  .chip button {
    width: auto;
    background: none;
    border: none;
    color: var(--muted);
    cursor: pointer;
    font-size: var(--fs-md);
    line-height: 1;
    padding: 0;
  }
  .chip button:hover {
    color: var(--error);
  }
  .seg-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }
  .seg {
    display: flex;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    padding: 3px;
    gap: 3px;
    box-shadow: var(--shadow-card);
  }
  .seg button {
    flex: 1;
    padding: 9px;
    background: none;
    border: none;
    color: var(--muted);
    border-radius: var(--r-sm);
    cursor: pointer;
    font: inherit;
    font-size: var(--fs-sm);
    font-weight: 600;
  }
  .seg button.on {
    background: var(--accent-soft);
    color: var(--accent);
  }
  .card {
    background: var(--bg-subtle);
    border: 1px solid var(--border-subtle);
    border-radius: var(--r-lg);
    padding: 18px 20px;
    margin-top: 18px;
    box-shadow: var(--shadow-card);
  }
  .toggle-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
  }
  .toggle-card b {
    color: var(--text);
  }
  .toggle-card p {
    color: var(--muted);
    font-size: var(--fs-sm);
    margin-top: 3px;
  }
  .switch {
    flex-shrink: 0;
    width: 48px;
    height: 27px;
    border-radius: 20px;
    border: none;
    background: var(--border);
    cursor: pointer;
    padding: 3px;
    transition: background 0.15s;
  }
  .switch.on {
    background: var(--accent);
  }
  .switch span {
    display: block;
    width: 21px;
    height: 21px;
    border-radius: 50%;
    background: #fff;
    transition: transform 0.15s;
  }
  .switch.on span {
    transform: translateX(21px);
  }
  .rating-card h3 {
    font-size: var(--fs-md);
    margin-bottom: 5px;
  }
  .rating-card p {
    color: var(--muted);
    font-size: var(--fs-sm);
    margin-bottom: 4px;
  }
  .rating-actions {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-top: 12px;
  }
  .btn {
    font-size: var(--fs-sm);
    font-weight: 600;
    padding: 9px 15px;
    border-radius: var(--r-md);
    cursor: pointer;
    border: 1px solid var(--border);
    background: var(--bg);
    color: var(--text);
  }
  .btn:hover {
    border-color: var(--muted);
  }
  .btn.primary {
    background: var(--accent);
    color: var(--on-link);
    border-color: var(--accent);
  }
  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .link {
    background: none;
    border: none;
    color: var(--accent);
    font: inherit;
    font-size: var(--fs-sm);
    font-weight: 600;
    cursor: pointer;
  }
  .rating-result {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid var(--border-subtle);
  }
  .tier {
    display: block;
    font-family: var(--font-display);
    font-weight: 900;
    font-size: var(--fs-lg);
    color: var(--heading);
    margin: 2px 0 10px;
  }
  .rating-result ul {
    list-style: none;
    display: flex;
    flex-wrap: wrap;
    gap: 6px 18px;
  }
  .rating-result li {
    font-size: var(--fs-sm);
    color: var(--muted);
  }
  .note {
    margin-top: 10px;
    font-size: var(--fs-xs);
    color: var(--muted);
    line-height: 1.5;
  }
  @container page (max-width: 520px) {
    .seg-row {
      grid-template-columns: 1fr;
    }
  }
</style>
