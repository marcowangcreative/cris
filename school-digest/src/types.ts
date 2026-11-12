export const CATEGORIES = [
  "deadline",
  "event",
  "closure",
  "schedule_change",
  "payment",
  "form",
  "supplies",
  "homework",
  "reply_needed",
  "other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export type InfoType = "official" | "parent_chatter" | "unknown";

export type SourceKind = "email" | "whatsapp" | "drop";

export interface SourceRef {
  kind: SourceKind;
  /** WhatsApp group name, or the email From line. */
  sender_or_group: string;
  /** Person who sent the chat line, or the email From line. */
  sender: string;
  /** ISO instant of the source message. */
  message_date: string;
  subject?: string;
  info_type: InfoType;
  message_id: string;
  account?: string;
}

export interface DigestItem {
  child: string;
  category: Category;
  title: string;
  /** School-local civil time: YYYY-MM-DD or YYYY-MM-DDTHH:mm. Not UTC. */
  date: string | null;
  deadline: string | null;
  /** "$12" or "$12.50". */
  amount: string | null;
  action_needed: string | null;
  info_type: InfoType;
  source: SourceRef;
  sources: SourceRef[];
}

export interface NormalizedMessage {
  id: string;
  kind: SourceKind;
  sender: string;
  person: string;
  group?: string;
  subject?: string;
  body: string;
  date: Date;
  account?: string;
  fallback_children: string[];
  info_type: InfoType;
}

export interface ChildConfig {
  id: string;
  name: string;
  grade: string;
  program: string;
  sender_domains: string[];
  keywords: string[];
  whatsapp_groups: string[];
}

export interface AppConfig {
  timezone: string;
  window_days: number;
  date_order: "MDY" | "DMY";
  gmail_accounts: { id: string }[];
  children: ChildConfig[];
  official_whatsapp_senders: string[];
  official_email_domains: string[];
  also_include_sender_domains: string[];
  ignore: {
    sender_domains: string[];
    sender_addresses: string[];
    subject_keywords: string[];
    body_keywords: string[];
  };
  paths: {
    whatsapp_dir: string;
    drop_dir: string;
    output_dir: string;
  };
  llm: {
    provider: "openai" | "anthropic" | "openai-compatible";
    model: string;
    base_url: string;
  };
  delivery: {
    mode: "file" | "gmail";
    to: string;
    from_account: string;
    write_ics: boolean;
  };
}
