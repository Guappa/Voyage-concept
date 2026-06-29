const IMAGE_KEY = /(image|portrait|cover|avatar|banner|icon|art)url$|^(image|portrait|cover|avatar|banner)$/i;

// Infers an editor field from a live value so any section can expose every key in the world JSON.
export function inferField(key, value) {
  if (IMAGE_KEY.test(key) && (typeof value === "string" || value == null)) return { key, label: key, type: "image" };
  if (typeof value === "boolean") return { key, label: key, type: "bool" };
  if (typeof value === "number") return { key, label: key, type: "number" };
  if (typeof value === "string") {
    if (/^#[0-9a-f]{3,8}$/i.test(value)) return { key, label: key, type: "color" };
    return { key, label: key, type: value.length > 80 ? "textarea" : "text" };
  }
  if (Array.isArray(value)) {
    return value.every((v) => typeof v === "string") ? { key, label: key, type: "tags" } : { key, label: key, type: "json" };
  }
  if (value && typeof value === "object") return { key, label: key, type: "json" };
  return { key, label: key, type: "text" };
}

// Collects the union of fields across a map or array of entry objects, sampling enough entries to capture the schema.
export function introspectEntries(entriesOrArray, sample = 40) {
  const items = Array.isArray(entriesOrArray) ? entriesOrArray : Object.values(entriesOrArray ?? {});
  const fields = new Map();
  for (const item of items.slice(0, sample)) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    for (const [k, v] of Object.entries(item)) {
      if (!fields.has(k)) fields.set(k, inferField(k, v));
    }
  }
  return [...fields.values()];
}

// Treats a single object's own keys as fields, for settings singletons.
export function introspectObject(obj) {
  return Object.entries(obj ?? {}).map(([k, v]) => inferField(k, v));
}
