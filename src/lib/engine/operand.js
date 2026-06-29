// An operand is a fixed literal, a reference to one live stat, or a no-code formula over stats, so rules express maths between stats without dropping to scripts.
export function isRefOperand(operand) {
  return Boolean(operand) && typeof operand === "object" && Boolean(operand.ref);
}

export function isExprOperand(operand) {
  return Boolean(operand) && typeof operand === "object" && typeof operand.expr === "string";
}

// Tokenises against the known stat names so identifiers with spaces ("Fire Resistance") still parse.
function tokenize(expr, names) {
  const sorted = [...names].sort((a, b) => b.length - a.length);
  const tokens = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (ch === " ") {
      i += 1;
      continue;
    }
    if ("+-*/()".includes(ch)) {
      tokens.push({ t: "op", v: ch });
      i += 1;
      continue;
    }
    const numMatch = /^[0-9]*\.?[0-9]+/.exec(expr.slice(i));
    if (numMatch) {
      tokens.push({ t: "num", v: Number(numMatch[0]) });
      i += numMatch[0].length;
      continue;
    }
    const name = sorted.find((n) => n && expr.startsWith(n, i));
    if (name) {
      tokens.push({ t: "id", v: name });
      i += name.length;
      continue;
    }
    return null;
  }
  return tokens;
}

// Recursive-descent arithmetic so the sandbox stays honest (no eval); an unparseable formula resolves to 0, like a failed script.
function evalExpr(expr, resolveName, names) {
  const tokens = tokenize(expr ?? "", names ?? []);
  if (!tokens || !tokens.length) return 0;
  let position = 0;
  const peek = () => tokens[position];
  const take = () => tokens[position++];

  function parseExpr() {
    let value = parseTerm();
    while (peek() && peek().t === "op" && (peek().v === "+" || peek().v === "-")) {
      const op = take().v;
      const right = parseTerm();
      value = op === "+" ? value + right : value - right;
    }
    return value;
  }
  function parseTerm() {
    let value = parseFactor();
    while (peek() && peek().t === "op" && (peek().v === "*" || peek().v === "/")) {
      const op = take().v;
      const right = parseFactor();
      value = op === "*" ? value * right : right === 0 ? 0 : value / right;
    }
    return value;
  }
  function parseFactor() {
    const tk = peek();
    if (!tk) return 0;
    if (tk.t === "op" && tk.v === "-") {
      take();
      return -parseFactor();
    }
    if (tk.t === "op" && tk.v === "(") {
      take();
      const value = parseExpr();
      if (peek() && peek().v === ")") take();
      return value;
    }
    if (tk.t === "num") {
      take();
      return tk.v;
    }
    if (tk.t === "id") {
      take();
      return Number(resolveName(tk.v)) || 0;
    }
    take();
    return 0;
  }
  return parseExpr();
}

// `read(kind, name)` is supplied by each caller because conditions read from a ctx snapshot and effects read from working state.
export function resolveOperand(operand, read, names) {
  if (isRefOperand(operand)) return read(operand.ref.kind, operand.ref.name);
  if (isExprOperand(operand)) return evalExpr(operand.expr, (name) => read("component", name), names);
  return operand;
}

export function operandLabel(operand) {
  if (isExprOperand(operand)) return operand.expr || "…";
  if (isRefOperand(operand)) return operand.ref.name || "…";
  return operand === "" || operand == null ? "…" : String(operand);
}

export function validExpr(expr, names) {
  return tokenize(expr ?? "", names ?? []) !== null;
}

// Kinds an author can reference as a single value, limited to the numeric, engine-known state the preview can resolve.
export const VALUE_REF_KINDS = [
  { kind: "component", label: "stat" },
  { kind: "skill", label: "skill" },
];
