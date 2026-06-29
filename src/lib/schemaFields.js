import schema from "./v33-schema.json";

// Fields the editor never exposes: machine-managed vectors and fixed format markers.
const OMIT = new Set(["embeddingId", "embeddings", "embeddingModel", "embeddingDimension", "configVersion", "heroesVersion"]);

const IMAGE_KEY = /(image|portrait|cover|avatar|banner|icon|art)url$|^(image|portrait|cover|avatar|banner)$/i;
const LONG_TEXT_KEY = /(info|instructions?|description|guidance|prompt|brief|backstory|background|statement|lore|text)$/i;

function topSections() {
  const out = {};
  const parts = schema._type === "intersection" ? schema.parts : [schema];
  for (const part of parts) {
    if (part.fields) for (const [key, value] of Object.entries(part.fields)) out[key] = value;
  }
  return out;
}

// A record/list stores its entries' shape one level down; a singleton is the shape itself.
function shapeOf(node) {
  if (!node || typeof node !== "object") return null;
  if (node._type === "record") return node.codomain;
  if (node._type === "array") return node.of;
  return node;
}

// Flatten intersection/required/partial/union into one field map, recording which keys are required.
function mergeFields(node, accumulated, required) {
  if (!node || typeof node !== "object") return;
  if (node._type === "intersection") {
    for (const part of node.parts ?? []) mergeFields(part, accumulated, required);
    return;
  }
  if (node._type === "union") {
    for (const part of node.of ?? []) mergeFields(part, accumulated, required);
    return;
  }
  if (node.fields) {
    const isRequired = node._type === "required";
    for (const [key, value] of Object.entries(node.fields)) {
      if (!accumulated.has(key)) accumulated.set(key, value);
      if (isRequired) required.add(key);
    }
  }
}

function isEnum(node) {
  return node && node._type === "union" && (node.of ?? []).every((part) => part && part._type === "literal");
}

function toEditorType(node) {
  if (typeof node === "string") {
    if (node === "Int" || node === "number") return { type: "number" };
    if (node === "boolean") return { type: "bool" };
    return { type: "text" };
  }
  if (!node || typeof node !== "object") return { type: "text" };
  if (node._type === "literal") return { type: "literal" };
  if (isEnum(node)) return { type: "enum", options: node.of.map((part) => part.value) };
  if (node._type === "array") return node.of === "string" ? { type: "tags" } : { type: "json" };
  return { type: "json" };
}

const cache = new Map();

// The full field set for a section, derived from the schema so every field shows even when the world hasn't set it.
export function sectionSchemaFields(sectionKey) {
  if (cache.has(sectionKey)) return cache.get(sectionKey);
  const node = topSections()[sectionKey];
  const accumulated = new Map();
  const required = new Set();
  mergeFields(shapeOf(node), accumulated, required);
  const fields = [];
  for (const [key, value] of accumulated) {
    if (OMIT.has(key)) continue;
    const mapped = toEditorType(value);
    if (mapped.type === "literal") continue;
    let type = mapped.type;
    if (type === "text" && IMAGE_KEY.test(key)) type = "image";
    else if (type === "text" && LONG_TEXT_KEY.test(key)) type = "textarea";
    fields.push({ key, type, options: mapped.options, required: required.has(key) });
  }
  cache.set(sectionKey, fields);
  return fields;
}

// "characterLoraEnabled" → "Character lora enabled", so schema-only fields get a readable label.
export function humanizeKey(key) {
  const spaced = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
