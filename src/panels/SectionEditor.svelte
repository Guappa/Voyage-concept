<script>
  import { store } from "../lib/store.svelte.js";
  import { SECTIONS } from "../lib/sections.js";
  import { introspectEntries, introspectObject } from "../lib/introspect.js";
  import { sectionSchemaFields, humanizeKey } from "../lib/schemaFields.js";
  import FieldInput from "../components/FieldInput.svelte";

  let { id } = $props();
  const section = $derived(SECTIONS[id]);

  const isSingleton = $derived(section.kind === "singleton");
  const isScalar = $derived(section.kind === "scalar");
  const isList = $derived(section.kind === "list");
  const isStringmap = $derived(section.kind === "stringmap");
  const isRecordMap = $derived(section.kind === "recordmap");
  const isRecord = $derived(section.kind === "record" || isStringmap || isRecordMap);

  let selectedKey = $state(null);
  let selectedIndex = $state(0);
  let showAdvanced = $state(false);
  const PAGE_SIZE = 30;
  let listSearch = $state("");
  let page = $state(0);

  const entries = $derived(isRecord ? (store.project[section.key] ?? {}) : null);
  const items = $derived(isList ? (store.project[section.key] ?? []) : null);
  const keys = $derived(entries ? Object.keys(entries) : []);

  // Fields come from the schema (so every field shows even when this world hasn't set it), with curated entries as overrides and data-only keys as a fallback.
  const effectiveFields = $derived.by(() => {
    if (isScalar) return [];
    const curated = section.fields ?? [];
    if (isStringmap || isRecordMap) return curated;
    const curatedMap = new Map(curated.map((f) => [f.key, f]));
    const schemaFields = sectionSchemaFields(section.key);
    const schemaMap = new Map(schemaFields.map((f) => [f.key, f]));
    const noCurated = curated.length === 0;

    const result = curated.map((f) => {
      const s = schemaMap.get(f.key);
      return {
        ...f,
        required: f.required ?? s?.required ?? false,
        options: f.options ?? (f.type === "enum" && !f.enumFrom ? s?.options : f.options),
      };
    });

    for (const s of schemaFields) {
      if (curatedMap.has(s.key) || s.key === section.keyField) continue;
      result.push({ key: s.key, label: humanizeKey(s.key), type: s.type, options: s.options, required: s.required, advanced: !noCurated && !s.required });
    }

    let found = [];
    if (isSingleton) found = introspectObject(store.project[section.key] ?? {});
    else if (isList) found = introspectEntries(items ?? []);
    else found = introspectEntries(entries ?? {});
    const have = new Set([...curatedMap.keys(), ...schemaMap.keys()]);
    for (const f of found) {
      if (have.has(f.key) || f.key === section.keyField) continue;
      result.push({ ...f, label: humanizeKey(f.key), advanced: f.type !== "image" });
    }
    return result;
  });

  // a scalar section stores one value directly under its key, so it binds a single field against the project root
  const scalarField = $derived(isScalar ? { key: section.key, label: section.label, type: section.scalarType, options: section.options } : null);

  const nameField = $derived(effectiveFields.find((f) => f.key === section.keyField));
  const bodyFields = $derived(effectiveFields.filter((f) => f.key !== section.keyField));
  const basicFields = $derived(bodyFields.filter((f) => !f.advanced));
  const advancedFields = $derived(bodyFields.filter((f) => f.advanced));

  const filteredKeys = $derived(listSearch.trim() ? keys.filter((k) => k.toLowerCase().includes(listSearch.trim().toLowerCase())) : keys);
  const pageCount = $derived(Math.max(1, Math.ceil(filteredKeys.length / PAGE_SIZE)));
  const pagedKeys = $derived(filteredKeys.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE));

  // reset paging when the section or filter changes
  $effect(() => {
    void id;
    void listSearch;
    page = 0;
  });

  // keep a valid selection as the user adds, deletes, or switches sections
  $effect(() => {
    void id;
    if (isRecord && (selectedKey === null || !keys.includes(selectedKey))) selectedKey = keys[0] ?? null;
    if (isList && (items.length === 0 || selectedIndex < 0 || selectedIndex >= items.length)) selectedIndex = items.length ? 0 : -1;
  });

  const entry = $derived(isSingleton ? store.project[section.key] : isStringmap ? null : isList ? (selectedIndex >= 0 ? items[selectedIndex] : null) : selectedKey ? entries[selectedKey] : null);

  const limits = $derived(section.limits ?? null);
  const taskBlocks = $derived(isRecordMap && selectedKey && entries[selectedKey] && typeof entries[selectedKey] === "object" ? entries[selectedKey] : null);
  const taskTotal = $derived(taskBlocks ? Object.values(taskBlocks).reduce((sum, v) => sum + String(v ?? "").length, 0) : 0);
  const availableTasks = $derived(isRecordMap ? (section.tasks ?? []).filter((t) => !keys.includes(t)) : []);
  let newTask = $state("");

  function updateBlock(blockName, value) {
    store.project[section.key][selectedKey][blockName] = value;
  }

  // block keys identify the instruction, so renaming rekeys the task's map in place
  function renameBlock(oldName, value) {
    const name = value.trim();
    const task = entries[selectedKey];
    if (!name || name === oldName || task[name] != null) return;
    const next = {};
    for (const [key, val] of Object.entries(task)) next[key === oldName ? name : key] = val;
    store.project[section.key][selectedKey] = next;
  }

  function addBlock() {
    const task = entries[selectedKey] ?? {};
    let name = "newBlock";
    let n = 2;
    while (task[name] != null) name = `newBlock${n++}`;
    store.project[section.key][selectedKey] = { ...task, [name]: "" };
  }

  function removeBlock(blockName) {
    const next = { ...entries[selectedKey] };
    delete next[blockName];
    store.project[section.key][selectedKey] = next;
  }

  function addTask() {
    if (!newTask) return;
    store.project[section.key] = { ...entries, [newTask]: {} };
    selectedKey = newTask;
    newTask = "";
  }

  function blankEntry() {
    const fresh = {};
    for (const field of bodyFields) {
      if (field.type === "tags" || field.type === "refs") fresh[field.key] = [];
      else if (field.type === "number") fresh[field.key] = 0;
      else if (field.type === "bool") fresh[field.key] = false;
      else if (field.type === "color") fresh[field.key] = "#79b8ff";
      else if (field.type === "json") fresh[field.key] = null;
      else fresh[field.key] = "";
    }
    return fresh;
  }

  function uniqueName(base) {
    let name = base;
    let n = 2;
    while (entries[name]) name = `${base} ${n++}`;
    return name;
  }

  function addEntry() {
    if (isStringmap) {
      const name = uniqueName("New entry");
      store.project[section.key] = { ...entries, [name]: "" };
      selectedKey = name;
      return;
    }
    const name = uniqueName(`New ${section.label.replace(/s$/, "")}`);
    const fresh = blankEntry();
    if (section.keyField) fresh[section.keyField] = name;
    store.project[section.key] = { ...entries, [name]: fresh };
    selectedKey = name;
  }

  function deleteEntry() {
    const next = { ...entries };
    delete next[selectedKey];
    store.project[section.key] = next;
    selectedKey = null;
  }

  // the record key is the identifier; renaming rekeys the map and syncs the name field when the section has one
  function rename(value) {
    const name = value.trim();
    if (!name || name === selectedKey || entries[name]) return;
    const next = {};
    for (const [key, val] of Object.entries(entries)) {
      if (key === selectedKey) {
        if (section.keyField && val && typeof val === "object") val[section.keyField] = name;
        next[name] = val;
      } else {
        next[key] = val;
      }
    }
    store.project[section.key] = next;
    selectedKey = name;
  }

  function addItem() {
    const fresh = blankEntry();
    if (section.keyField) fresh[section.keyField] = `New ${section.label.replace(/s$/, "")}`;
    const idx = items.length;
    store.project[section.key] = [...items, fresh];
    selectedIndex = idx;
  }

  function deleteItem() {
    store.project[section.key] = items.filter((_, i) => i !== selectedIndex);
    selectedIndex = 0;
  }

  const itemLabel = (it, i) => (section.keyField && it?.[section.keyField]) || `Item ${i + 1}`;

  // Structured block text is unreadable in a fixed box, so the textarea grows to fit and refits when the selection changes.
  function autoresize(node) {
    const fit = () => {
      node.style.height = "auto";
      node.style.height = `${node.scrollHeight + 2}px`;
    };
    requestAnimationFrame(fit);
    node.addEventListener("input", fit);
    return { update: () => requestAnimationFrame(fit), destroy: () => node.removeEventListener("input", fit) };
  }
</script>

<div class="ed">
  <div class="crumb">{section.label}</div>
  <h1>{section.label}</h1>
  <p class="blurb">{section.blurb}</p>

  {#if isScalar}
    <div class="card form">
      <FieldInput entry={store.project} field={scalarField} />
    </div>
  {:else if isSingleton}
    {#if entry}
      <div class="card form">
        {#each basicFields as field}<FieldInput {entry} {field} />{/each}
        {#if advancedFields.length}
          <button class="advtoggle" onclick={() => (showAdvanced = !showAdvanced)}>{showAdvanced ? "▾" : "▸"} Advanced</button>
          {#if showAdvanced}{#each advancedFields as field}<FieldInput {entry} {field} />{/each}{/if}
        {/if}
      </div>
    {:else}
      <p class="empty">This section is empty.</p>
    {/if}
  {:else if isList}
    <div class="split">
      <div class="list">
        <div class="rows">
          {#each items as it, i}
            <button class="row" class:cur={i === selectedIndex} onclick={() => (selectedIndex = i)}>{itemLabel(it, i)}</button>
          {/each}
          {#if items.length === 0}<p class="lnone">No entries yet.</p>{/if}
        </div>
        <button class="add" onclick={addItem}>＋ Add {section.label.replace(/s$/, "")}</button>
      </div>
      <div class="detail">
        {#if entry}
          {#if section.keyField}
            <label class="fld"
              ><span class="lbl">{nameField?.label ?? "Name"}</span>
              <input type="text" bind:value={entry[section.keyField]} />
            </label>
          {/if}
          {#each basicFields as field}<FieldInput {entry} {field} />{/each}
          {#if advancedFields.length}
            <button class="advtoggle" onclick={() => (showAdvanced = !showAdvanced)}>{showAdvanced ? "▾" : "▸"} Advanced</button>
            {#if showAdvanced}{#each advancedFields as field}<FieldInput {entry} {field} />{/each}{/if}
          {/if}
          <button class="del" onclick={deleteItem}>Delete</button>
        {:else}
          <p class="empty">No entries yet. Add one to begin.</p>
        {/if}
      </div>
    </div>
  {:else}
    <div class="split">
      <div class="list">
        {#if keys.length > 8}
          <input class="lsearch" placeholder="Filter {section.label.toLowerCase()}…" bind:value={listSearch} />
        {/if}
        <div class="rows">
          {#each pagedKeys as key}
            <button class="row" class:cur={key === selectedKey} onclick={() => (selectedKey = key)}>{key}</button>
          {/each}
          {#if filteredKeys.length === 0}<p class="lnone">No matches.</p>{/if}
        </div>
        {#if pageCount > 1}
          <div class="pager">
            <button onclick={() => (page = Math.max(0, page - 1))} disabled={page === 0} aria-label="Previous page">‹</button>
            <span>{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filteredKeys.length)} of {filteredKeys.length}</span>
            <button onclick={() => (page = Math.min(pageCount - 1, page + 1))} disabled={page >= pageCount - 1} aria-label="Next page">›</button>
          </div>
        {/if}
        {#if isRecordMap}
          {#if availableTasks.length}
            <div class="addtask">
              <select bind:value={newTask} aria-label="Task to add">
                <option value="" disabled>Add a task…</option>
                {#each availableTasks as t}<option value={t}>{t}</option>{/each}
              </select>
              <button onclick={addTask} disabled={!newTask} aria-label="Add task">＋</button>
            </div>
          {/if}
        {:else}
          <button class="add" onclick={addEntry}>＋ Add {section.label.replace(/s$/, "")}</button>
        {/if}
      </div>

      <div class="detail">
        {#if isStringmap ? selectedKey : entry}
          <label class="fld">
            <span class="lbl">{nameField?.label ?? (isRecordMap ? "Task" : "Key")}<i>*</i></span>
            <input type="text" value={selectedKey} onchange={(e) => rename(e.target.value)} />
          </label>
          {#if isStringmap}
            <label class="fld">
              <span class="lbl">Text</span>
              <textarea class="svalue mono" rows="10" use:autoresize={selectedKey} value={entries[selectedKey] ?? ""} oninput={(e) => (store.project[section.key][selectedKey] = e.target.value)}
              ></textarea>
            </label>
          {:else if isRecordMap}
            {#if limits}<div class="taskmeta" class:over={taskTotal > limits.perSection}>Task total {taskTotal.toLocaleString()} / {limits.perSection.toLocaleString()}</div>{/if}
            {#each Object.entries(taskBlocks ?? {}) as [blockName, text] (blockName)}
              <div class="block">
                <div class="blockhead">
                  <input class="blockname" value={blockName} onchange={(e) => renameBlock(blockName, e.target.value)} aria-label="Block name" />
                  <button class="brm" onclick={() => removeBlock(blockName)} aria-label="Remove block">×</button>
                </div>
                <textarea class="svalue" rows="6" use:autoresize={blockName} value={text ?? ""} oninput={(e) => updateBlock(blockName, e.target.value)} aria-label="{blockName} instruction"></textarea>
                {#if limits}<div class="cc" class:over={String(text ?? "").length > limits.perKey}>{String(text ?? "").length.toLocaleString()} / {limits.perKey.toLocaleString()}</div>{/if}
              </div>
            {/each}
            <button class="addblock" onclick={addBlock}>＋ Add instruction block</button>
          {:else}
            {#each basicFields as field}<FieldInput {entry} {field} />{/each}
            {#if advancedFields.length}
              <button class="advtoggle" onclick={() => (showAdvanced = !showAdvanced)}>{showAdvanced ? "▾" : "▸"} Advanced</button>
              {#if showAdvanced}{#each advancedFields as field}<FieldInput {entry} {field} />{/each}{/if}
            {/if}
          {/if}
          <button class="del" onclick={deleteEntry}>Delete {selectedKey}</button>
        {:else}
          <p class="empty">No entries yet. Add one to begin.</p>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .ed {
    max-width: 880px;
    margin: 0 auto;
  }
  .crumb {
    font-size: 15.5px;
    color: var(--muted);
    margin-bottom: 8px;
  }
  h1 {
    font-size: 28.5px;
    margin-bottom: 5px;
  }
  .blurb {
    color: var(--muted);
    font-size: 16.5px;
    max-width: 680px;
    margin-bottom: 12px;
  }
  .card {
    background: var(--bg-subtle);
    border: 1px solid var(--border-subtle);
    border-radius: var(--r-lg);
    box-shadow: var(--shadow-card);
  }
  .form {
    padding: 18px;
  }
  .split {
    display: grid;
    grid-template-columns: 230px 1fr;
    gap: 16px;
    align-items: start;
  }
  .list {
    background: var(--bg-subtle);
    border: 1px solid var(--border-subtle);
    border-radius: var(--r-lg);
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .lsearch {
    width: 100%;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--r-sm);
    padding: 7px 9px;
    margin-bottom: 4px;
    color: var(--text);
    font: inherit;
    font-size: 14.5px;
    outline: none;
  }
  .lsearch:focus {
    border-color: var(--accent);
  }
  .rows {
    display: flex;
    flex-direction: column;
    gap: 2px;
    max-height: 56vh;
    overflow-y: auto;
  }
  .lnone {
    color: var(--muted);
    font-size: 14px;
    padding: 10px;
  }
  .pager {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    padding: 6px 2px 2px;
    font-size: 13px;
    color: var(--muted);
  }
  .pager button {
    width: 28px;
    height: 28px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--r-sm);
    color: var(--text);
    cursor: pointer;
    font-size: 16px;
    line-height: 1;
  }
  .pager button:hover:not(:disabled) {
    border-color: var(--accent);
    color: var(--accent);
  }
  .pager button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .row {
    text-align: left;
    background: none;
    border: none;
    color: var(--text);
    padding: 8px 10px;
    border-radius: var(--r-sm);
    cursor: pointer;
    font-size: 16px;
  }
  .row:hover {
    background: var(--bg);
  }
  .row.cur {
    background: var(--accent-soft);
    color: var(--accent);
    font-weight: 600;
  }
  .add {
    margin-top: 6px;
    font-size: 15px;
    font-weight: 600;
    color: var(--accent);
    border: 1px dashed var(--border);
    border-radius: var(--r-md);
    padding: 8px;
    cursor: pointer;
    background: none;
  }
  .add:hover {
    background: var(--accent-soft);
    border-color: var(--accent);
  }
  .detail {
    background: var(--bg-subtle);
    border: 1px solid var(--border-subtle);
    border-radius: var(--r-lg);
    padding: 18px;
    box-shadow: var(--shadow-card);
  }
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
  .fld input,
  .svalue {
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
  .svalue {
    resize: vertical;
    line-height: 1.5;
  }
  .svalue.mono {
    font-family: var(--font-mono);
    font-size: 14px;
    line-height: 1.6;
  }
  .fld input:focus,
  .svalue:focus {
    border-color: var(--accent);
  }
  .advtoggle {
    background: none;
    border: none;
    color: var(--accent);
    font: inherit;
    font-size: 14.5px;
    font-weight: 600;
    cursor: pointer;
    padding: 4px 0;
    margin-bottom: 8px;
  }
  .del {
    margin-top: 8px;
    font-size: 14.5px;
    font-weight: 600;
    color: var(--error);
    background: none;
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    padding: 8px 14px;
    cursor: pointer;
  }
  .del:hover {
    border-color: var(--error);
  }
  .empty {
    color: var(--muted);
    font-size: 15px;
    padding: 10px 4px;
  }
  .addtask {
    display: flex;
    gap: 6px;
    margin-top: 6px;
  }
  .addtask select {
    flex: 1;
    min-width: 0;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--r-sm);
    color: var(--text);
    font: inherit;
    font-size: 14px;
    padding: 7px 8px;
  }
  .addtask button {
    width: 34px;
    background: none;
    border: 1px dashed var(--border);
    border-radius: var(--r-md);
    color: var(--accent);
    font-size: 16px;
    cursor: pointer;
  }
  .addtask button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .taskmeta {
    font-size: 13px;
    color: var(--muted);
    margin-bottom: 12px;
  }
  .taskmeta.over,
  .cc.over {
    color: var(--error);
    font-weight: 600;
  }
  .block {
    border: 1px solid var(--border-subtle);
    border-radius: var(--r-md);
    padding: 10px;
    margin-bottom: 12px;
    background: var(--bg);
  }
  .blockhead {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }
  .blockname {
    flex: 1;
    min-width: 0;
    background: var(--bg-subtle);
    border: 1px solid var(--border);
    border-radius: var(--r-sm);
    color: var(--heading);
    font: inherit;
    font-size: 15px;
    font-weight: 600;
    padding: 6px 9px;
    outline: none;
  }
  .blockname:focus {
    border-color: var(--accent);
  }
  .brm {
    background: none;
    border: none;
    color: var(--muted);
    font-size: 18px;
    cursor: pointer;
  }
  .brm:hover {
    color: var(--error);
  }
  .cc {
    text-align: right;
    font-size: 12.5px;
    color: var(--muted);
    margin-top: 5px;
  }
  .addblock {
    width: 100%;
    font-size: 14.5px;
    font-weight: 600;
    color: var(--accent);
    border: 1px dashed var(--border);
    border-radius: var(--r-md);
    padding: 8px;
    cursor: pointer;
    background: none;
  }
  .addblock:hover {
    background: var(--accent-soft);
    border-color: var(--accent);
  }
  @container page (max-width: 640px) {
    .split {
      grid-template-columns: 1fr;
    }
  }
</style>
