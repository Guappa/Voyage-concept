// Account-level world metadata saved separately from the world file; blank by default so a reset world has no leftover listing.
export function defaultSiteMeta() {
  return {
    name: "Untitled world",
    cover: "",
    description: "",
    markdown: "",
    tags: [],
    type: "world",
    visibility: "private",
    allowRemix: true,
    rating: { overall: "Everyone", axes: { Lore: "Everyone", Mechanics: "Everyone", Entities: "Everyone", Image: "Everyone", Mod: "Everyone" }, note: "Not yet rated." },
    ratingChecksRemaining: 50,
    enabledMods: [],
  };
}

// Larion's listing, which the website stores separately from the world JSON, so it rides along with the Larion load rather than the file.
export function larionSiteMeta() {
  return {
    name: "Larion",
    cover: `${import.meta.env.BASE_URL}images/9be4f657-7575-4bbc-95fe-95689e54fbd6.webp`,
    description:
      "Larion is a world of walled cities and wild frontiers, ancient forests and buried ruins, merchant republics and orc horse-clans. Magic lights the streets of every major city, and monsters prowl the roads between them. Twelve regions span the map, from the green heartland of Highvale where the League of Adventurers hands out contracts, to the alpine peaks of the Moon Kingdoms where vampire lords rule with ancient grace and a terrible hunger. What you do here is up to you.",
    markdown: `## Medieval fantasy at its brightest and most dangerous

Larion is a world of walled cities and wild frontiers, ancient forests and buried ruins, merchant republics and orc horse-clans. Magic lights the streets of every major city. Monsters prowl the roads between them. Twelve regions span the map, from the green heartland of Highvale where the League of Adventurers hands out contracts, to the alpine peaks of the Moon Kingdoms where vampire lords rule with ancient grace and a terrible hunger.

## What you do here is up to you

Hunt monsters for coin. Infiltrate a masked ball in the Spice Isles. Take a contract from the League and make a name for yourself. Enroll in the Academy of the Arcane. Inherit a crumbling manor and rebuild it. Run a tavern. Pick a side in someone else's war, or start one of your own. Join a thieves' guild, a knightly order, a mercenary company. Find companions worth keeping and enemies worth fighting. Fall in love. Save the world, or just save your corner of it.

The people you meet are as vivid as the places. Expect grumpy innkeepers, scheming merchants, idealistic knights, orc warriors who show affection through insults, and companions who'll argue with you around the campfire and then risk their lives for you in the morning. Nobody here is boring (unless it's you).

Larion rewards the bold. Dark things may stir at the fringes of the world, but this is a place where good wins more than it loses, and *heroes* are made by riding out to make things better.`,
    tags: ["fantasy", "adventure", "slice of life"],
    type: "world",
    visibility: "private",
    allowRemix: true,
    rating: { overall: "Teen", axes: { Lore: "Teen", Mechanics: "Teen", Entities: "Teen", Image: "Everyone", Mod: "Everyone" }, note: "Rated Teen on Voyage." },
    ratingChecksRemaining: 50,
    enabledMods: ["elemental-combat", "survival-systems", "hardcore-rules", "crafting-expanded"],
  };
}

const RATING_TIERS = ["Everyone", "Teen", "Mature"];
const AXES = ["Lore", "Mechanics", "Entities", "Image", "Mod"];

// Illustration only: derives a plausible rating spread from the content so the panel feels live without a real check.
export function mockRating(meta) {
  const corpus = `${meta.description} ${meta.markdown} ${meta.tags.join(" ")}`.toLowerCase();
  const mature = /\b(blood|kill|death|war|massacre|gore|brutal|punishing|lethal)\b/.test(corpus);
  const teen = /\b(combat|fight|empire|politics|conflict|magic|monster)\b/.test(corpus);
  const tierFor = () => (mature ? "Mature" : teen ? "Teen" : "Everyone");
  const axes = Object.fromEntries(AXES.map((axis) => [axis, axis === "Image" || axis === "Mod" ? "Everyone" : tierFor()]));
  const overall = RATING_TIERS[Math.max(...Object.values(axes).map((t) => RATING_TIERS.indexOf(t)))];
  return { overall, axes, note: "Heuristic preview generated locally from the world's text. The live studio runs a real model check." };
}
