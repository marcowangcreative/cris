import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { encodeBase64Url, loadOAuthClient } from "./gmail";
import { zonedParts, formatCivil } from "./time";

export function digestSubject(asOf: Date, timeZone: string): string {
  const parts = zonedParts(asOf, timeZone);
  return `School digest - week ending ${formatCivil(parts, false)}, ${parts.year}`;
}

function encodeHeader(value: string): string {
  if (/^[\t\x20-\x7e]*$/.test(value)) return value;
  return `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

export function buildRfc822(options: {
  to: string;
  subject: string;
  text: string;
  html: string;
  ics?: string;
  boundary?: string;
  altBoundary?: string;
}): string {
  if (/[\r\n]/.test(options.to) || /[\r\n]/.test(options.subject)) {
    throw new Error("Refusing to build a message because a header contains a newline.");
  }
  const mixed = options.boundary ?? `mix-${randomBytes(8).toString("hex")}`;
  const alt = options.altBoundary ?? `alt-${randomBytes(8).toString("hex")}`;
  const alternative = [
    `--${alt}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    options.text.replace(/\r?\n/g, "\r\n"),
    `--${alt}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    options.html.replace(/\r?\n/g, "\r\n"),
    `--${alt}--`,
    "",
  ].join("\r\n");

  if (!options.ics) {
    return [
      `To: ${options.to}`,
      `Subject: ${encodeHeader(options.subject)}`,
      "MIME-Version: 1.0",
      `Content-Type: multipart/alternative; boundary="${alt}"`,
      "",
      alternative,
    ].join("\r\n");
  }

  return [
    `To: ${options.to}`,
    `Subject: ${encodeHeader(options.subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${mixed}"`,
    "",
    `--${mixed}`,
    `Content-Type: multipart/alternative; boundary="${alt}"`,
    "",
    alternative,
    `--${mixed}`,
    "Content-Type: text/calendar; charset=UTF-8; method=PUBLISH",
    "Content-Transfer-Encoding: 8bit",
    'Content-Disposition: attachment; filename="school-digest.ics"',
    "",
    options.ics.replace(/\r?\n/g, "\r\n"),
    `--${mixed}--`,
    "",
  ].join("\r\n");
}

export function writeDigestFiles(options: {
  markdown?: { path: string; body: string };
  html?: { path: string; body: string };
  ics?: { path: string; body: string };
}): string[] {
  const written: string[] = [];
  for (const file of [options.markdown, options.html, options.ics]) {
    if (!file) continue;
    fs.mkdirSync(path.dirname(file.path), { recursive: true });
    fs.writeFileSync(file.path, file.body);
    written.push(file.path);
  }
  return written;
}

export async function sendViaGmail(options: {
  root: string;
  accountId: string;
  to: string;
  subject: string;
  text: string;
  html: string;
  ics?: string;
}): Promise<void> {
  if (!options.to || !options.to.includes("@")) {
    throw new Error("delivery.to must be an email address before --deliver gmail can send.");
  }
  const client = loadOAuthClient(options.root, options.accountId);
  const raw = encodeBase64Url(
    buildRfc822({
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      ics: options.ics,
    }),
  );
  await client.request({
    url: "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    method: "POST",
    data: { raw },
  });
}
