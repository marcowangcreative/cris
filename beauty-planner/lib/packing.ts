import type { Member, PlannerEvent } from "./types";

export interface PackingCategory {
  id: string;
  label: string;
  items: string[];
}

export interface PackingSuggestion {
  text: string;
  category: string;
}

export const PACKING_CATEGORIES: PackingCategory[] = [
  {
    id: "hair-tools",
    label: "Hair tools",
    items: [
      "Flat iron",
      "Curling iron",
      "Blow dryer",
      "Round brushes",
      "Tail comb and teasing brush",
      "Sectioning clips",
      "Bobby pins and hair elastics",
    ],
  },
  {
    id: "hair-products",
    label: "Hair products",
    items: ["Heat protectant", "Working spray", "Finishing spray", "Dry shampoo", "Shine oil", "Texture spray"],
  },
  {
    id: "makeup-tools",
    label: "Makeup tools",
    items: [
      "Foundation and powder brushes",
      "Sponges",
      "Eye brushes",
      "Tweezers",
      "Lash applicator",
      "Disposable wands",
    ],
  },
  {
    id: "makeup-products",
    label: "Makeup products",
    items: [
      "Primer",
      "Foundation range",
      "Concealer",
      "Powder",
      "Cheek and highlight",
      "Eye palettes",
      "Mascara and lashes",
      "Lip colors",
      "Setting spray",
    ],
  },
  {
    id: "prep",
    label: "Skin prep and sanitation",
    items: ["Facial mist", "Moisturizer", "Cotton rounds", "Alcohol wipes", "Tissues", "Disposable lip applicators"],
  },
  {
    id: "comfort",
    label: "Client comfort",
    items: ["Capes", "Hand mirror", "Water", "Snacks", "Bride touch-up kit"],
  },
  {
    id: "team",
    label: "Team and power",
    items: ["Extension cord and power strip", "Portable charger", "Steamer", "First-aid kit", "Trash bags"],
  },
];

const US_PATTERN =
  /\b(usa|united states|u\.s\.a?|alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|florida|georgia|hawaii|idaho|illinois|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|new hampshire|new jersey|new mexico|new york|north carolina|north dakota|ohio|oklahoma|oregon|pennsylvania|rhode island|south carolina|south dakota|tennessee|texas|utah|vermont|virginia|washington|west virginia|wisconsin|wyoming|nyc|sonoma|napa)\b/i;

export function packingSuggestions(members: readonly Member[], details: Pick<PlannerEvent, "hasExtensions" | "isOutdoor" | "location" | "venue">): PackingSuggestion[] {
  const suggestions: PackingSuggestion[] = [];
  const hairCount = members.filter((member) => member.services === "hair" || member.services === "both").length;
  const makeupCount = members.filter((member) => member.services === "makeup" || member.services === "both").length;
  const hasFlowerGirl = members.some((member) => member.role === "flower_girl");
  const place = `${details.location} ${details.venue}`.toLowerCase();

  if (hairCount >= 4) suggestions.push({ text: `Extra pins and clips for ${hairCount} hair clients`, category: "Hair tools" });
  if (hairCount >= 6) suggestions.push({ text: "Backup curling iron and blow dryer", category: "Hair tools" });
  if (makeupCount >= 4) suggestions.push({ text: `Extra sponges for ${makeupCount} makeup clients`, category: "Makeup tools" });
  if (makeupCount >= 6) suggestions.push({ text: "Backup mascara", category: "Makeup products" });
  if (details.hasExtensions) suggestions.push({ text: "Extension wefts and bond remover", category: "Hair tools" });
  if (hasFlowerGirl) suggestions.push({ text: "Gentle-hold products for the flower girl", category: "Hair products" });
  if (details.isOutdoor) {
    suggestions.push({ text: "Humidity-resistant finishing spray", category: "Hair products" });
    suggestions.push({ text: "Longer-wear setting spray for an outdoor ceremony", category: "Makeup products" });
  }
  if (members.length >= 8) suggestions.push({ text: "Second cape and mirror setup", category: "Client comfort" });
  if (place.trim() && !US_PATTERN.test(place)) {
    suggestions.push({ text: "Plug adapter and voltage check for hot tools", category: "Team and power" });
  }
  return suggestions;
}
