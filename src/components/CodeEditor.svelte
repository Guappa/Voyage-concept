<script>
  import { onMount, onDestroy } from "svelte";
  import { EditorView, basicSetup } from "codemirror";
  import { EditorState } from "@codemirror/state";
  import { placeholder as cmPlaceholder } from "@codemirror/view";
  import { javascript } from "@codemirror/lang-javascript";
  import { syntaxHighlighting, HighlightStyle } from "@codemirror/language";
  import { tags as t } from "@lezer/highlight";

  let { value = $bindable(""), placeholder = "", minHeight = "116px", readonly = false } = $props();

  // VS Code dark palette, mirroring the wiki's script editor so code reads the same across both apps
  const HIGHLIGHT = HighlightStyle.define([
    { tag: t.keyword, color: "#569CD6" },
    { tag: t.string, color: "#B5C677" },
    { tag: t.number, color: "#B5CEA8" },
    { tag: t.bool, color: "#569CD6" },
    { tag: t.null, color: "#569CD6" },
    { tag: t.variableName, color: "#9CDCFE" },
    { tag: t.function(t.variableName), color: "#DCDCAA" },
    { tag: t.comment, color: "#6A9955", fontStyle: "italic" },
    { tag: [t.punctuation, t.brace, t.bracket, t.separator], color: "#D4D4D4" },
  ]);

  let host;
  let view = null;

  onMount(() => {
    view = new EditorView({
      state: EditorState.create({
        doc: value ?? "",
        extensions: [
          basicSetup,
          EditorView.lineWrapping,
          javascript(),
          syntaxHighlighting(HIGHLIGHT),
          EditorState.readOnly.of(readonly),
          EditorView.editable.of(!readonly),
          cmPlaceholder(placeholder),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) value = update.state.doc.toString();
          }),
          EditorView.theme(
            {
              "&": { fontSize: "14px", color: "var(--text)", backgroundColor: "var(--code)" },
              ".cm-content": { fontFamily: "var(--font-mono)", padding: "10px", minHeight },
              ".cm-gutters": { background: "var(--code-toolbar)", border: "none", color: "var(--muted)" },
              ".cm-cursor": { borderLeftColor: "var(--text)" },
              ".cm-focused": { outline: "none" },
              ".cm-activeLine, .cm-activeLineGutter": { background: "transparent" },
            },
            { dark: true },
          ),
        ],
      }),
      parent: host,
    });
  });

  // push external value changes (e.g. switching to another rule) back into the editor without a loop
  $effect(() => {
    const next = value ?? "";
    if (view && next !== view.state.doc.toString()) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: next } });
    }
  });

  onDestroy(() => {
    if (view) {
      view.destroy();
      view = null;
    }
  });
</script>

<div class="ce" bind:this={host}></div>

<style>
  .ce {
    border-top: 1px solid var(--border-subtle);
    overflow: hidden;
  }
</style>
