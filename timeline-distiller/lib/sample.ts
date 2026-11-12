import { assembleSheet } from "./assemble";
import { enforceCitations } from "./citations";
import { parseManualList } from "./formals";
import type { ModelExtraction } from "./types";

export const SAMPLE_LINES = [
  "BLOOM DRAFT — not for vendors — day-of timeline",
  "Couple: Priya Vellani & Elias Crowe",
  "Date: Saturday, November 14, 2026",
  "Planner: Linen & Lark Events — desk 713-555-0142",
  "Day-of coordinator: Sable Nguyen — 713-555-0198 (call her, not the planner)",
  "",
  "VENUES",
  "Ceremony and reception: The Glass Orchard, 4100 Navigation Blvd, Houston, TX",
  "Getting ready, bride: Marlowe House Hotel, Room 1204, 818 Prairie St, Houston, TX",
  "Getting ready, groom: The Glass Orchard, Suite B (same building as the ceremony)",
  "",
  "VENDOR LOGISTICS — photographers can skip this block",
  "7:00 AM Catering load-in. Kitchen is closed to everyone except Sweetbrick Catering.",
  "7:30 AM Linen delivery from White Table Co. Do not let them use the photo suite.",
  "8:15 AM Florist strike, Petal District. Install the ceremony arch, then the sweetheart table.",
  "9:00 AM Rentals: chiavari chairs, lounge set, dance floor. Sunday strike is 10:00 AM.",
  "11:00 AM Cake delivery, Sugar Moth Bakery. Cake table is on the mezzanine.",
  "2:30 PM DJ Miles sound check. Playlist is private. He will not announce the send-off.",
  "3:00 PM Bartenders in. Signature drink is The Navigation.",
  "5:00 PM Shuttle loop starts. Guests park at the lot on Canal, not at the hotel.",
  "",
  "PHOTO NOTES FROM THE PLANNER",
  "Stay out of the catering kitchen. No photos of the vendor meal.",
  "Ceremony is unplugged. Guests were told phones away. Please help hold that.",
  "Officiant Rev. June Palliser does not want flash, and wants photographers behind the last row of chairs during vows. Step to the side aisle for the kiss only.",
  "The couple wants a first look. They do not want to see each other before that.",
  "",
  "RUN OF SHOW",
  "1:00 PM Bride getting ready, Marlowe House Hotel room 1204. Dress is steaming. Mom Anjali Vellani and sister Rina are in the room. Flat lay of the invitation, rings, and shoes is already on the desk.",
  "1:30 PM Groom getting ready, Glass Orchard Suite B. Elias, his dad Mark Crowe, and three groomsmen.",
  "3:10 PM First look in the Glass Orchard west garden, then a few portraits of just the two of them. Wedding party joins at 3:30 PM if the first look runs long.",
  "3:50 PM Bride is still finishing at the hotel. Ceremony is at 4:00 PM at The Glass Orchard. The drive is usually 20 minutes.",
  "4:00 PM Ceremony starts on The Glass Orchard lawn. Processional, vows, rings, kiss, recessional. About 25 minutes. Guest doors at 3:45 PM.",
  "4:40 PM to 4:55 PM Family formals on the front steps. Roughly 20 family groupings. Please try to make the 15 minutes work.",
  "5:10 PM Couple portraits only if the light is nice. Sunset and golden hour: photographer should check sunset. No sunset time was booked.",
  "6:00 PM Reception doors, The Glass Orchard mezzanine. Dinner is seated.",
  "6:25 PM Grand entrance. DJ will not start until he sees the photographer in place.",
  "6:40 PM Toasts: sister Rina Vellani, then best man Omar Shah.",
  "7:05 PM First dance, then parent dances. Anjali with Elias, Mark with Priya.",
  "7:35 PM Cake cut at the mezzanine cake table.",
  "9:15 PM Sparkler send-off at the Navigation Blvd doors. Sparklers are provided. No cold sparks.",
  "",
  "PEOPLE",
  "Officiant: Rev. June Palliser. No cell on file.",
  "Flower girl: cousin Bea. Ring bearer: cousin Nico.",
];

export const SAMPLE_SOURCE = SAMPLE_LINES.join("\n");

export const SAMPLE_FORMALS_TEXT = [
  "The Couple — Priya & Elias",
  "Both families — Priya, Elias, Anjali, Dev, Mark, Helen",
  "Bride's parents — Priya, Anjali, Dev",
  "Bride with Mom — Priya, Anjali",
  "Bride with Dad — Priya, Dev",
  "Groom's parents — Elias, Mark, Helen",
  "Groom with Mom — Elias, Helen",
  "Groom with Dad — Elias, Mark",
  "Bride's immediate family — Priya, Elias, Anjali, Dev, Rina, Arun",
  "Bride with siblings — Priya, Rina, Arun",
  "Groom's immediate family — Elias, Priya, Mark, Helen, Caleb",
  "Groom with siblings — Elias, Caleb",
  "All siblings — Priya, Elias, Rina, Arun, Caleb",
  "Bride's grandparents — Priya, Elias, Lata, Rohan",
  "Groom's grandparents — Priya, Elias, Ruth",
  "Bride's extended — Priya, Elias, Anjali, Dev, Rina, Arun, Lata, Rohan, Meera, Sol, Bea",
  "Full wedding party — Priya, Elias, Rina, Noor, Tess, Omar, Caleb, Jonah",
  "Bride + bridesmaids — Priya, Rina, Noor, Tess",
  "Groom + groomsmen — Elias, Omar, Caleb, Jonah",
  "With the officiant — Priya, Elias, June",
].join("\n");

function lineContaining(snippet: string): number {
  const index = SAMPLE_LINES.findIndex((line) => line.includes(snippet));
  if (index < 0) throw new Error(`Sample line not found: ${snippet}`);
  return index + 1;
}

function cite(snippet: string) {
  const sourceLine = lineContaining(snippet);
  return {
    sourceLine,
    sourceExcerpt: SAMPLE_LINES[sourceLine - 1],
    inferred: false as const,
  };
}

function headerCite(snippet: string) {
  const cited = cite(snippet);
  return {
    sourceLine: cited.sourceLine,
    sourceExcerpt: cited.sourceExcerpt,
    inferred: false as const,
  };
}

/** Cached model output for the sample timeline. No network call. */
export function sampleModelOutput(): ModelExtraction {
  const couple = headerCite("Couple: Priya Vellani");
  const date = headerCite("Date: Saturday, November 14, 2026");
  const sunset = headerCite("photographer should check sunset");
  const shoot = (title: string, kind: ModelExtraction["beats"][number]["kind"], time: string, endTime: string, snippet: string, location: string, whatToShoot: string, people: string, assignee: ModelExtraction["beats"][number]["assignee"]) => ({
    kind,
    time,
    endTime,
    title,
    location,
    address: "",
    whatToShoot,
    people,
    assignee,
    assigneeInferred: true,
    ...cite(snippet),
  });

  return {
    couple: "Priya Vellani & Elias Crowe",
    coupleSourceLine: couple.sourceLine,
    coupleSourceExcerpt: couple.sourceExcerpt,
    coupleInferred: false,
    date: "Saturday, November 14, 2026",
    dateSourceLine: date.sourceLine,
    dateSourceExcerpt: date.sourceExcerpt,
    dateInferred: false,
    sunsetNote: "Check sunset.",
    sunsetSourceLine: sunset.sourceLine,
    sunsetSourceExcerpt: sunset.sourceExcerpt,
    sunsetInferred: false,
    transcription: "",
    locations: [
      {
        name: "The Glass Orchard",
        address: "4100 Navigation Blvd, Houston, TX",
        role: "Ceremony and reception",
        ...cite("4100 Navigation Blvd"),
      },
      {
        name: "Marlowe House Hotel",
        address: "818 Prairie St, Houston, TX",
        role: "Bride getting ready",
        ...cite("818 Prairie St"),
      },
      {
        name: "The Glass Orchard, Suite B",
        address: "",
        role: "Groom getting ready",
        ...cite("Suite B"),
      },
    ],
    contacts: [
      {
        role: "Planner",
        name: "Linen & Lark Events",
        phone: "713-555-0142",
        ...cite("713-555-0142"),
      },
      {
        role: "Day-of coordinator",
        name: "Sable Nguyen",
        phone: "713-555-0198",
        ...cite("713-555-0198"),
      },
      {
        role: "Officiant",
        name: "Rev. June Palliser",
        phone: "",
        ...cite("No cell on file"),
      },
    ],
    constraints: [
      {
        kind: "unplugged",
        text: "Ceremony is unplugged. Guests were told phones away.",
        ...cite("Ceremony is unplugged"),
      },
      {
        kind: "no-flash",
        text: "No flash. Officiant wants photographers behind the last row during vows, side aisle for the kiss only.",
        ...cite("does not want flash"),
      },
      {
        kind: "other",
        text: "Stay out of the catering kitchen. No photos of the vendor meal.",
        ...cite("Stay out of the catering kitchen"),
      },
    ],
    beats: [
      shoot(
        "Bride getting ready",
        "getting-ready",
        "1:00 PM",
        "",
        "1:00 PM Bride getting ready",
        "Marlowe House Hotel",
        "Dress, flat lay of invitation, rings, and shoes. Mom Anjali and sister Rina in the room.",
        "Anjali Vellani, Rina",
        "second",
      ),
      shoot(
        "Groom getting ready",
        "getting-ready",
        "1:30 PM",
        "",
        "1:30 PM Groom getting ready",
        "The Glass Orchard",
        "Elias with his dad Mark Crowe and three groomsmen.",
        "Elias, Mark Crowe",
        "lead",
      ),
      shoot(
        "First look",
        "first-look",
        "3:10 PM",
        "",
        "3:10 PM First look",
        "The Glass Orchard",
        "Approach and reaction, then a few portraits of just the two of them. Party may join at 3:30 PM.",
        "Priya, Elias",
        "lead",
      ),
      shoot(
        "Bride still at the hotel",
        "other",
        "3:50 PM",
        "3:50 PM",
        "3:50 PM Bride is still finishing",
        "the hotel",
        "She is still at the hotel. The planner also says the drive is usually 20 minutes.",
        "Priya",
        "second",
      ),
      shoot(
        "Ceremony",
        "ceremony",
        "4:00 PM",
        "",
        "4:00 PM Ceremony starts",
        "The Glass Orchard",
        "Processional, vows, rings, kiss, recessional. About 25 minutes. Doors at 3:45 PM.",
        "",
        "lead",
      ),
      shoot(
        "Family formals",
        "family-formals",
        "4:40 PM",
        "4:55 PM",
        "4:40 PM to 4:55 PM",
        "front steps",
        "Family groupings on the front steps. The planner asked to fit about 20 groupings into this window.",
        "",
        "lead",
      ),
      shoot(
        "Couple portraits",
        "portraits",
        "5:10 PM",
        "",
        "5:10 PM Couple portraits",
        "The Glass Orchard",
        "Only if the light is nice.",
        "Priya, Elias",
        "lead",
      ),
      shoot(
        "Check sunset",
        "sunset",
        "",
        "",
        "photographer should check sunset",
        "",
        "Check sunset. No clock time was booked. Do not look one up.",
        "",
        "both",
      ),
      shoot(
        "Reception doors",
        "other",
        "6:00 PM",
        "",
        "6:00 PM Reception doors",
        "The Glass Orchard",
        "Be in place before guests sit for dinner.",
        "",
        "both",
      ),
      shoot(
        "Grand entrance",
        "grand-entrance",
        "6:25 PM",
        "",
        "6:25 PM Grand entrance",
        "",
        "DJ waits until the photographer is in place.",
        "Priya, Elias",
        "lead",
      ),
      shoot(
        "Toasts",
        "toasts",
        "6:40 PM",
        "",
        "6:40 PM Toasts",
        "",
        "Sister Rina Vellani, then best man Omar Shah. Cover the speaker and the couple.",
        "Rina Vellani, Omar Shah",
        "both",
      ),
      shoot(
        "First dance",
        "first-dance",
        "7:05 PM",
        "",
        "7:05 PM First dance",
        "",
        "First dance, then parent dances: Anjali with Elias, Mark with Priya.",
        "Priya, Elias, Anjali, Mark",
        "lead",
      ),
      shoot(
        "Cake",
        "cake",
        "7:35 PM",
        "",
        "7:35 PM Cake cut",
        "",
        "Cake cut at the mezzanine cake table.",
        "Priya, Elias",
        "lead",
      ),
      shoot(
        "Send-off",
        "send-off",
        "9:15 PM",
        "",
        "9:15 PM Sparkler send-off",
        "Navigation Blvd doors",
        "Sparkler send-off. No cold sparks.",
        "",
        "both",
      ),
    ],
    gaps: [
      {
        text: "The bride is still at the hotel at 3:50 PM, ceremony is 4:00 PM, and the drive is usually 20 minutes. Ask which number is real.",
        severity: "ask",
        ...cite("The drive is usually 20 minutes"),
      },
      {
        text: "Family formals are 4:40 PM to 4:55 PM with roughly 20 groupings. Ask for a longer window or a shorter list.",
        severity: "ask",
        ...cite("Roughly 20 family groupings"),
      },
      {
        text: "Rev. June Palliser has stance rules and no cell on file. Ask Sable for a number.",
        severity: "ask",
        ...cite("No cell on file"),
      },
    ],
  };
}

export const SAMPLE_MODEL_OUTPUT: ModelExtraction = sampleModelOutput();

export function buildDemoSheet() {
  const grounded = enforceCitations(SAMPLE_MODEL_OUTPUT, SAMPLE_SOURCE);
  return assembleSheet({
    extraction: grounded.extraction,
    rejected: grounded.rejected,
    groups: parseManualList(SAMPLE_FORMALS_TEXT),
    baseMinutes: 2,
    travelBufferMinutes: 15,
    sourceName: "Demo timeline",
    demo: true,
  });
}
