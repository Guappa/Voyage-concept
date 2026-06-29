// Browser autofill audits flag form controls with no id/name; this guarantees raw inputs always carry one.
let counter = 0;
export function named(node) {
  if (!node.getAttribute("name") && !node.id) node.setAttribute("name", `field-${++counter}`);
}
