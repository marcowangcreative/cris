import type { ChecklistItem } from "./types";

export function defaultChecklist(): ChecklistItem[] {
  return [
    { id: "details-rings", segment: "details", text: "Rings, invitation, shoes, jewelry", assignee: "both", done: false },
    { id: "details-attire", segment: "details", text: "Dress and suit hanging, before they're on", assignee: "both", done: false },
    { id: "details-flowers", segment: "details", text: "Bouquet, boutonnieres, and the arch before guests sit", assignee: "lead", done: false },
    { id: "ready-bride", segment: "getting-ready", text: "Bride: dress details, buttons, and the people in the room", assignee: "second", done: false },
    { id: "ready-groom", segment: "getting-ready", text: "Groom: tie, jacket, and the people in the room", assignee: "lead", done: false },
    { id: "ready-reaction", segment: "getting-ready", text: "A letter or gift reaction, if it actually happens", assignee: "both", done: false },
    { id: "look-reaction", segment: "first-look", text: "The approach and the reaction, tight and full", assignee: "lead", done: false },
    { id: "look-portraits", segment: "first-look", text: "A few portraits of just the couple before anyone joins", assignee: "lead", done: false },
    { id: "cer-wide", segment: "ceremony", text: "Room wide, before guests sit", assignee: "lead", done: false },
    { id: "cer-moments", segment: "ceremony", text: "Processional, vows, rings, kiss, recessional", assignee: "lead", done: false },
    { id: "cer-rule", segment: "ceremony", text: "Stay inside the officiant's rule for where you stand", assignee: "both", done: false },
    { id: "port-couple", segment: "portraits", text: "Couple portraits", assignee: "lead", done: false },
    { id: "port-party", segment: "portraits", text: "Wedding party", assignee: "lead", done: false },
    { id: "port-formals", segment: "portraits", text: "Family formals, in the slotted order", assignee: "lead", done: false },
    { id: "port-sunset", segment: "portraits", text: "Golden hour: check sunset, don't guess the clock", assignee: "lead", done: false },
    { id: "rec-tables", segment: "reception", text: "Tables and the cake table before doors open", assignee: "second", done: false },
    { id: "rec-entrance", segment: "reception", text: "Grand entrance", assignee: "lead", done: false },
    { id: "rec-toasts", segment: "reception", text: "Toasts: the speaker and the couple's reaction", assignee: "both", done: false },
    { id: "rec-dance", segment: "reception", text: "First dance and parent dances", assignee: "lead", done: false },
    { id: "rec-cake", segment: "reception", text: "Cake cut", assignee: "lead", done: false },
    { id: "rec-floor", segment: "reception", text: "Dance floor", assignee: "second", done: false },
    { id: "rec-send", segment: "reception", text: "Send-off", assignee: "both", done: false },
  ];
}
