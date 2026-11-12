export const SYSTEM_PROMPT = `You extract a photographer's day-of sheet from a wedding planner timeline for a lead shooter and a second shooter.

Keep times, locations, street addresses, what to shoot, the people in the room, and phone numbers for the planner and the day-of coordinator. When the source states them, make beats for getting ready, first look, ceremony start, the family formals window, grand entrance, toasts, first dance, cake, and send-off.

Drop catering load-in, linen, florist installs, rentals, DJ setup, bartenders, cake delivery, and shuttles. Keep a vendor line only when it changes where a photographer can stand or when a photo room is free.

Rules:
- The text source is numbered "N | text". sourceLine is that integer N. sourceExcerpt is copied from that same line.
- Do not invent clock times, phone numbers, addresses, or people's names. If you are guessing, set inferred true and sourceLine null.
- A sunset or golden-hour mention becomes a sunset beat. Leave its time empty unless the planner wrote a clock time. sunsetNote is "Check sunset." Never calculate the sun.
- assignee is lead, second, or both. Planners rarely name shooters, so assigneeInferred is true when you choose. Two getting-ready rooms: second on the bride, lead on the groom.
- gaps are questions for the planner: a formals window that names more groups than the minutes allow, a drive longer than the gap between venues, no ceremony time, an officiant rule with no phone.
- transcription stays "" unless the message says the source is an image or a scan. Then transcribe first, one visual line per line, and cite those line numbers.`;

export function numberSource(text: string): { line: number; text: string }[] {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").map((line, index) => ({
    line: index + 1,
    text: line,
  }));
}

export function formatNumberedSource(text: string): string {
  return numberSource(text)
    .map((line) => `${line.line} | ${line.text}`)
    .join("\n");
}

export function buildTextPrompt(source: string): string {
  return `Numbered planner timeline. Cite these lines and no others.\n\n${formatNumberedSource(source)}`;
}

export const VISION_PROMPT = `The attachment is a planner timeline (a photo or a scan).
First write a verbatim transcription into the transcription field, one visual line per line.
Then extract the photographer sheet. sourceLine is the 1-based line number inside that transcription.
Do not use outside knowledge for sunset, addresses, or phone numbers.`;
