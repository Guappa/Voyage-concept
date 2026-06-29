<script>
  import { store } from "../lib/store.svelte.js";

  let { entry, field } = $props();

  function resolvePath(path) {
    return path.split(".").reduce((node, key) => node?.[key], store.project);
  }

  // ref/refs options are the live keys of another section, so cross-references can only point at things that exist
  const options = $derived.by(() => {
    if (field.type === "enum") return field.options ?? resolvePath(field.enumFrom) ?? [];
    if (field.type === "ref" || field.type === "refs") return Object.keys(store.project[field.ref] ?? {});
    return [];
  });

  let tagDraft = $state("");
  let imgFile = $state();

  // emulated upload: read the chosen file as a data URL straight into the field (no server in this concept)
  function uploadImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => (entry[field.key] = reader.result);
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  function addTag() {
    const value = tagDraft.trim();
    if (!value) return;
    entry[field.key] = [...(entry[field.key] ?? []), value];
    tagDraft = "";
  }

  function removeTag(index) {
    entry[field.key] = entry[field.key].filter((_, i) => i !== index);
  }

  function addRef(name) {
    if (!name) return;
    if ((entry[field.key] ?? []).includes(name)) return;
    entry[field.key] = [...(entry[field.key] ?? []), name];
  }

  // Long-form fields read as blocks rather than tiny scroll boxes, so the textarea grows to fit its content.
  function autoresize(node) {
    const fit = () => {
      node.style.height = "auto";
      node.style.height = `${Math.max(node.scrollHeight + 2, 88)}px`;
    };
    requestAnimationFrame(fit);
    node.addEventListener("input", fit);
    return { update: () => requestAnimationFrame(fit), destroy: () => node.removeEventListener("input", fit) };
  }

  function jsonText(value) {
    try {
      return JSON.stringify(value ?? null, null, 2);
    } catch {
      return "";
    }
  }

  // raw JSON editing is the catch-all for nested objects and arrays, so every field stays editable
  function setJson(el) {
    try {
      entry[field.key] = JSON.parse(el.value);
      el.classList.remove("bad");
    } catch {
      el.classList.add("bad");
    }
  }
</script>

<label class="fld">
  <span class="lbl"
    >{field.label}{#if field.required}<i>*</i>{/if}</span
  >

  {#if field.type === "textarea"}
    <textarea bind:value={entry[field.key]} use:autoresize={entry[field.key]} maxlength={field.max} rows="3"></textarea>
    {#if field.max}<span class="count">{(entry[field.key] ?? "").length} / {field.max}</span>{/if}
  {:else if field.type === "number"}
    <input type="number" bind:value={entry[field.key]} />
  {:else if field.type === "bool"}
    <input class="check" type="checkbox" bind:checked={entry[field.key]} />
  {:else if field.type === "color"}
    <input class="color" type="color" bind:value={entry[field.key]} />
  {:else if field.type === "json"}
    <textarea class="json" rows="5" value={jsonText(entry[field.key])} onchange={(e) => setJson(e.target)}></textarea>
  {:else if field.type === "image"}
    <div class="img">
      {#if entry[field.key]}
        <img class="imgprev" src={entry[field.key]} alt="" onerror={(e) => (e.target.style.display = "none")} onload={(e) => (e.target.style.display = "block")} />
      {/if}
      <div class="imgrow">
        <button type="button" class="imgbtn" onclick={() => imgFile.click()}>✎ Upload image</button>
        {#if entry[field.key]}<button type="button" class="imgbtn" onclick={() => (entry[field.key] = "")}>🗑 Remove</button>{/if}
      </div>
      <input type="text" placeholder="https://… or upload" bind:value={entry[field.key]} />
      <input bind:this={imgFile} type="file" accept="image/*" onchange={uploadImage} hidden />
    </div>
  {:else if field.type === "enum"}
    <select bind:value={entry[field.key]}>
      <option value="">—</option>
      {#each options as opt}<option value={opt}>{opt}</option>{/each}
    </select>
  {:else if field.type === "ref"}
    <select bind:value={entry[field.key]}>
      <option value="">—</option>
      {#each options as opt}<option value={opt}>{opt}</option>{/each}
    </select>
  {:else if field.type === "refs"}
    <div class="chips">
      {#each entry[field.key] ?? [] as name, i}
        <span class="chip">{name}<button type="button" onclick={() => removeTag(i)}>×</button></span>
      {/each}
    </div>
    <select
      value=""
      onchange={(e) => {
        addRef(e.target.value);
        e.target.value = "";
      }}
    >
      <option value="">+ add…</option>
      {#each options.filter((o) => !(entry[field.key] ?? []).includes(o)) as opt}<option value={opt}>{opt}</option>{/each}
    </select>
  {:else if field.type === "tags"}
    <div class="chips">
      {#each entry[field.key] ?? [] as tag, i}
        <span class="chip">{tag}<button type="button" onclick={() => removeTag(i)}>×</button></span>
      {/each}
    </div>
    <input value={tagDraft} oninput={(e) => (tagDraft = e.target.value)} onkeydown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())} placeholder="type and press Enter" />
  {:else}
    <input type="text" bind:value={entry[field.key]} />
  {/if}

  {#if field.help}<span class="help">{field.help}</span>{/if}
</label>

<style>
  .fld {
    display: block;
    margin-bottom: 14px;
  }
  .lbl {
    display: block;
    font-size: 14px;
    font-weight: 600;
    color: var(--muted);
    margin-bottom: 5px;
  }
  .lbl i {
    color: var(--accent);
    font-style: normal;
    margin-left: 2px;
  }
  input,
  textarea,
  select {
    width: 100%;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--r-sm);
    padding: 8px 10px;
    color: var(--text);
    font: inherit;
    font-size: 16px;
    outline: none;
  }
  textarea {
    resize: vertical;
    line-height: 1.5;
  }
  input:focus,
  textarea:focus,
  select:focus {
    border-color: var(--accent);
  }
  .check {
    width: 18px;
    height: 18px;
    accent-color: var(--accent);
  }
  .color {
    height: 34px;
    padding: 2px;
  }
  .json {
    font-family: var(--font-mono);
    font-size: 13px;
  }
  /* .bad is toggled imperatively in setJson, so it is global to survive Svelte's scoped-CSS pruning */
  .json:global(.bad) {
    border-color: var(--error);
  }
  .img {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .imgprev {
    width: 100%;
    max-height: 200px;
    object-fit: cover;
    border-radius: var(--r-md);
    border: 1px solid var(--border);
    background: var(--bg);
  }
  .imgrow {
    display: flex;
    gap: 8px;
  }
  .imgbtn {
    flex: 0 0 auto;
    width: auto;
    font-size: 14px;
    font-weight: 600;
    padding: 7px 12px;
    border-radius: var(--r-md);
    border: 1px solid var(--border);
    background: var(--bg);
    color: var(--text);
    cursor: pointer;
  }
  .imgbtn:hover {
    border-color: var(--muted);
  }
  .count {
    display: block;
    text-align: right;
    font-size: 12.5px;
    color: var(--muted);
    margin-top: 3px;
  }
  .help {
    display: block;
    font-size: 13.5px;
    color: var(--muted);
    margin-top: 5px;
    line-height: 1.45;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    margin-bottom: 6px;
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 14px;
    background: var(--bg-subtle);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 3px 5px 3px 10px;
  }
  .chip button {
    background: none;
    border: none;
    color: var(--muted);
    cursor: pointer;
    font-size: 16.5px;
    line-height: 1;
  }
  .chip button:hover {
    color: var(--error);
  }
</style>
