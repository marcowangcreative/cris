import fs from "node:fs";
import path from "node:path";
import { authorizeAccount } from "./auth";
import { loadConfig } from "./config";
import { digestSubject, sendViaGmail, writeDigestFiles } from "./deliver";
import { loadDotEnv } from "./env";
import { runDigest } from "./pipeline";
import { PACKAGE_ROOT } from "./root";
import { isSundaySevenPm } from "./time";

interface Flags {
  [key: string]: string | boolean;
}

function parseArgs(argv: string[]): { command: string; flags: Flags } {
  const flags: Flags = {};
  const positionals: string[] = [];
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--") continue;
    if (token.startsWith("--")) {
      const key = token.slice(2);
      const next = argv[index + 1];
      if (next == null || next.startsWith("--")) flags[key] = true;
      else {
        flags[key] = next;
        index += 1;
      }
    } else positionals.push(token);
  }
  return { command: positionals[0] ?? "digest", flags };
}

function resolveExisting(file: string): string {
  if (path.isAbsolute(file)) return file;
  const fromCwd = path.resolve(process.cwd(), file);
  if (fs.existsSync(fromCwd)) return fromCwd;
  const fromRoot = path.resolve(PACKAGE_ROOT, file);
  if (fs.existsSync(fromRoot)) return fromRoot;
  return fromCwd;
}

function flagString(flags: Flags, key: string): string | undefined {
  const value = flags[key];
  return typeof value === "string" ? value : undefined;
}

function printHelp(): void {
  console.log(`School digest

  npm run auth -- --account inbox-a
  npm run digest -- --deliver file
  npm run sample

Commands
  auth      Save a Gmail OAuth token for one account id
  digest    Build this week's digest (default)

Digest flags
  --config <file>          Default: config.json (copy config.example.json)
  --fixtures               Read the committed fake fixtures and skip Gmail
  --as-of <ISO>            Pretend "now" is this instant
  --extractor heuristic|llm
  --deliver file|gmail     Default: delivery.mode in the config
  --out-md <file>          Markdown path (default: out/digest.md)
  --no-html                Skip the HTML file
  --no-ics                 Skip the .ics file and the email attachment
  --skip-gmail             Do not call Gmail
  --scheduled              Exit unless it is Sunday 7 PM in the config timezone
  --force                  Run even when --scheduled is outside that hour
`);
}

async function main(): Promise<void> {
  loadDotEnv(path.join(PACKAGE_ROOT, ".env"));
  const { command, flags } = parseArgs(process.argv.slice(2));
  if (flags.help || command === "help") {
    printHelp();
    return;
  }

  if (command === "auth") {
    const account = flagString(flags, "account");
    if (!account) throw new Error("Pass --account with the id from gmail_accounts, for example inbox-a.");
    await authorizeAccount(PACKAGE_ROOT, account);
    return;
  }

  if (command !== "digest") throw new Error(`Unknown command "${command}". Try --help.`);

  const configPath = resolveExisting(flagString(flags, "config") ?? "config.json");
  const config = loadConfig(configPath, PACKAGE_ROOT);
  if (flags.scheduled && !flags.force && !isSundaySevenPm(new Date(), config.timezone)) {
    console.log(`Not Sunday 7 PM in ${config.timezone}. Nothing sent. Use --force to run anyway.`);
    return;
  }

  const asOfRaw = flagString(flags, "as-of");
  const asOf = asOfRaw ? new Date(asOfRaw) : new Date();
  if (Number.isNaN(asOf.getTime())) throw new Error(`Invalid --as-of value "${asOfRaw}".`);

  const requested = flagString(flags, "extractor");
  const extractor = requested ?? (process.env.LLM_API_KEY ? "llm" : "heuristic");
  if (extractor !== "heuristic" && extractor !== "llm") {
    throw new Error('--extractor must be "heuristic" or "llm".');
  }

  const deliver = flagString(flags, "deliver") ?? config.delivery.mode;
  if (deliver !== "file" && deliver !== "gmail") throw new Error('--deliver must be "file" or "gmail".');

  const fixtures = Boolean(flags.fixtures);
  if (!fixtures) {
    fs.mkdirSync(config.paths.whatsapp_dir, { recursive: true });
    fs.mkdirSync(config.paths.drop_dir, { recursive: true });
  }

  const result = await runDigest({
    config,
    root: PACKAGE_ROOT,
    asOf,
    extractor,
    whatsappDir: fixtures ? path.join(PACKAGE_ROOT, "fixtures/whatsapp") : config.paths.whatsapp_dir,
    dropDir: fixtures ? path.join(PACKAGE_ROOT, "fixtures/drop") : config.paths.drop_dir,
    includeGmail: !fixtures && !flags["skip-gmail"],
    strictFolders: fixtures,
  });

  const markdownPath = flagString(flags, "out-md")
    ? path.resolve(process.cwd(), flagString(flags, "out-md") as string)
    : path.join(config.paths.output_dir, "digest.md");
  const writeIcs = !flags["no-ics"] && (deliver === "file" ? config.delivery.write_ics : true);
  const written = writeDigestFiles({
    markdown: { path: markdownPath, body: result.markdown },
    html: flags["no-html"] ? undefined : { path: path.join(config.paths.output_dir, "digest.html"), body: result.html },
    ics: writeIcs ? { path: path.join(config.paths.output_dir, "digest.ics"), body: result.ics } : undefined,
  });

  if (deliver === "gmail") {
    const account = config.delivery.from_account || config.gmail_accounts[0]?.id;
    if (!account) throw new Error("Set delivery.from_account to a gmail_accounts id before sending.");
    await sendViaGmail({
      root: PACKAGE_ROOT,
      accountId: account,
      to: config.delivery.to,
      subject: digestSubject(asOf, config.timezone),
      text: result.markdown,
      html: result.html,
      ics: writeIcs ? result.ics : undefined,
    });
    console.log(`Sent the digest to ${config.delivery.to} from account ${account}.`);
  }

  console.log(`Extractor: ${extractor}`);
  console.log(`Items: ${result.items.length}`);
  console.log(`Ignored: ${result.stats.ignored}`);
  console.log(`Outside the ${config.window_days}-day window: ${result.stats.outsideWindow}`);
  console.log(`Parent-chat messages set aside: ${result.stats.skippedChatter}`);
  for (const file of written) console.log(`Wrote ${file}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  if (process.env.DEBUG) console.error(error);
  process.exitCode = 1;
});
