"use server";

import fs from "node:fs";
import path from "node:path";
import { redirect } from "next/navigation";
import { newId } from "@/lib/ids";
import { getConfig } from "@/lib/rules";
import { signMagicLink } from "@/lib/demo/token";
import { readDemoDb, safeUploadPath, updateDemoDb } from "@/lib/demo/store";
import { publishReleaseBatch } from "@/lib/domain/availability";
import { DomainError } from "@/lib/domain/errors";
import { createWeddingInquiry, parseInquiry } from "@/lib/domain/inquiry";
import {
  addAsset,
  addCommitment,
  addNote,
  addProposal,
  approveProposal,
  createReleaseBatch,
  releaseUnconfirmedDay,
  resolveTask,
  saveIntake,
  setBoulevardRefs,
  setMarketingConsent,
  setWeddingStatus,
} from "@/lib/domain/studio";
import { chicagoDayInterval } from "@/lib/domain/time";
import type { WeddingStatus } from "@/lib/types";
import { clearActorCookie, requireAdmin, requireClient, setActorCookie } from "./session";

function assertDemo(): void {
  if (!getConfig().demoMode) {
    throw new DomainError("Live mode is disabled in this public MVP.");
  }
}

async function finish(pathName: string, work: () => Promise<void>, anchor = ""): Promise<void> {
  let message: string | null = null;
  try {
    assertDemo();
    await work();
  } catch (error) {
    message = error instanceof Error ? error.message : "Something went wrong.";
  }
  if (message) {
    redirect(`${pathName}?error=${encodeURIComponent(message)}${anchor}`);
  }
  redirect(`${pathName}?saved=1${anchor}`);
}

export async function logout(): Promise<void> {
  await clearActorCookie();
  redirect("/");
}

export async function demoSignIn(formData: FormData): Promise<void> {
  assertDemo();
  const db = readDemoDb();
  const staffId = String(formData.get("staffId") ?? "");
  const clientId = String(formData.get("clientId") ?? "");
  if (staffId && db.staff.some((staff) => staff.id === staffId)) {
    await setActorCookie({ role: "admin", staffId });
    redirect("/admin");
  }
  if (clientId && db.clients.some((client) => client.id === clientId)) {
    await setActorCookie({ role: "client", clientId });
    redirect("/portal");
  }
  redirect("/login?error=That demo profile is not in the seed.");
}

export async function requestMagicLink(formData: FormData): Promise<void> {
  assertDemo();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email.includes("@")) {
    redirect("/login?error=Enter an email address.");
  }
  const token = signMagicLink(email);
  redirect(`/login?magic=${encodeURIComponent(token)}`);
}

export async function submitInquiry(formData: FormData): Promise<void> {
  const files = formData
    .getAll("inspiration")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);
  let message: string | null = null;
  try {
    assertDemo();
    const prepared: Awaited<ReturnType<typeof readUpload>>[] = [];
    for (const file of files) {
      prepared.push(await readUpload(file));
    }
    await updateDemoDb((db) => {
      const created = createWeddingInquiry(
        db,
        parseInquiry({
          fullName: String(formData.get("fullName") ?? ""),
          email: String(formData.get("email") ?? ""),
          phone: String(formData.get("phone") ?? ""),
          weddingDate: String(formData.get("weddingDate") ?? ""),
          dateConfirmed: String(formData.get("dateConfirmed") ?? ""),
          venue: String(formData.get("venue") ?? ""),
          city: String(formData.get("city") ?? ""),
          gettingReadyLocation: String(formData.get("gettingReadyLocation") ?? ""),
          readyByTime: String(formData.get("readyByTime") ?? ""),
          services: String(formData.get("services") ?? ""),
          party: String(formData.get("party") ?? ""),
          brideCount: String(formData.get("brideCount") ?? ""),
          partyCount: String(formData.get("partyCount") ?? ""),
          fullJourney: String(formData.get("fullJourney") ?? ""),
          otherEvents: String(formData.get("otherEvents") ?? ""),
          travel: String(formData.get("travel") ?? ""),
          investmentRange: String(formData.get("investmentRange") ?? ""),
          referralSource: String(formData.get("referralSource") ?? ""),
        }),
        new Date().toISOString(),
      );
      for (const file of prepared) {
        writeAsset(db, {
          clientId: created.clientId,
          projectId: created.projectId,
          kind: "inspiration",
          ...file,
        });
      }
    });
  } catch (error) {
    message = error instanceof Error ? error.message : "Could not save the inquiry.";
  }
  if (message) redirect(`/weddings?error=${encodeURIComponent(message)}`);
  redirect("/weddings/received");
}

export async function saveIntakeAction(formData: FormData): Promise<void> {
  const session = await requireClient();
  const projectId = String(formData.get("projectId") ?? "");
  await finish(`/portal/projects/${projectId}`, async () => {
    await updateDemoDb((db) => {
      saveIntake(
        db,
        session.clientId,
        projectId,
        {
          hairHistory: String(formData.get("hairHistory") ?? ""),
          goals: String(formData.get("goals") ?? ""),
          scalpNotes: String(formData.get("scalpNotes") ?? ""),
          chemical: {
            color: formData.get("color") === "on",
            bleach: formData.get("bleach") === "on",
            relaxer: formData.get("relaxer") === "on",
            keratin: formData.get("keratin") === "on",
            last_chemical_service: String(formData.get("lastChemical") ?? ""),
            details: String(formData.get("chemicalDetails") ?? ""),
          },
        },
        new Date().toISOString(),
      );
    });
  }, "#intake");
}

export async function uploadAssetAction(formData: FormData): Promise<void> {
  const session = await requireClient();
  const projectId = String(formData.get("projectId") ?? "");
  const kind = String(formData.get("kind") ?? "");
  const file = formData.get("file");
  await finish(`/portal/projects/${projectId}`, async () => {
    if (!(file instanceof File) || file.size === 0) {
      throw new DomainError("Choose a photo to upload.");
    }
    if (kind !== "current_hair" && kind !== "inspiration") {
      throw new DomainError("Choose current hair or inspiration.");
    }
    const prepared = await readUpload(file);
    await updateDemoDb((db) => {
      const project = db.projects.find((item) => item.id === projectId);
      if (!project || project.client_id !== session.clientId) {
        throw new DomainError("Forbidden.");
      }
      writeAsset(db, {
        clientId: session.clientId,
        projectId,
        kind,
        ...prepared,
      });
    });
  }, "#photos");
}

export async function consentAction(formData: FormData): Promise<void> {
  const session = await requireClient();
  const projectId = String(formData.get("projectId") ?? "");
  await finish(`/portal/projects/${projectId}`, async () => {
    await updateDemoDb((db) => {
      setMarketingConsent(
        db,
        session.clientId,
        projectId,
        formData.get("marketing") === "on",
        new Date().toISOString(),
      );
    });
  }, "#photos");
}

export async function approveProposalAction(formData: FormData): Promise<void> {
  const session = await requireClient();
  const projectId = String(formData.get("projectId") ?? "");
  const proposalId = String(formData.get("proposalId") ?? "");
  await finish(`/portal/projects/${projectId}`, async () => {
    await updateDemoDb((db) => {
      approveProposal(db, session.clientId, proposalId, new Date().toISOString());
    });
  }, "#proposal");
}

export async function publishBatchAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const batchId = String(formData.get("batchId") ?? "");
  await finish("/admin/releases", async () => {
    await updateDemoDb((db) => {
      publishReleaseBatch(
        db,
        batchId,
        {
          weddings_reconciled: formData.get("weddings") === "on",
          travel_reviewed: formData.get("travel") === "on",
          personal_blocks_reviewed: formData.get("personal") === "on",
          existing_bookings_reviewed: formData.get("existing") === "on",
        },
        new Date().toISOString(),
        `staff:${session.staffId}`,
      );
    });
  });
}

export async function createBatchAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  await finish("/admin/releases", async () => {
    await updateDemoDb((db) => {
      createReleaseBatch(
        db,
        session.staffId,
        {
          year: Number(formData.get("year")),
          month: Number(formData.get("month")),
          weekdays: formData.getAll("weekday").map((value) => Number(value)),
        },
        new Date().toISOString(),
      );
    });
  });
}

export async function noteAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const projectId = String(formData.get("projectId") ?? "");
  await finish(`/admin/projects/${projectId}`, async () => {
    await updateDemoDb((db) => {
      addNote(
        db,
        session.staffId,
        projectId,
        String(formData.get("body") ?? ""),
        new Date().toISOString(),
      );
    });
  }, "#notes");
}

export async function boulevardAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const projectId = String(formData.get("projectId") ?? "");
  await finish(`/admin/projects/${projectId}`, async () => {
    await updateDemoDb((db) => {
      setBoulevardRefs(
        db,
        session.staffId,
        projectId,
        {
          orderRef: String(formData.get("orderRef") ?? ""),
          clientRef: String(formData.get("clientRef") ?? ""),
        },
        new Date().toISOString(),
      );
    });
  }, "#checkout");
}

export async function proposalAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const projectId = String(formData.get("projectId") ?? "");
  await finish(`/admin/projects/${projectId}`, async () => {
    const custom = String(formData.get("customDollars") ?? "").trim();
    const selected = String(formData.get("price") ?? "");
    let finalPriceCents: number | null = null;
    const dbPreview = readDemoDb();
    const project = dbPreview.projects.find((item) => item.id === projectId);
    if (project?.kind === "wedding") {
      finalPriceCents = null;
    } else if (custom) {
      finalPriceCents = Math.round(Number(custom) * 100);
    } else if (selected) {
      finalPriceCents = Number(selected);
    }
    await updateDemoDb((db) => {
      addProposal(
        db,
        session.staffId,
        {
          projectId,
          scope: String(formData.get("scope") ?? ""),
          finalPriceCents,
          estimatedTime: String(formData.get("estimatedTime") ?? ""),
          maintenance: String(formData.get("maintenance") ?? ""),
        },
        new Date().toISOString(),
      );
    });
  }, "#proposal");
}

export async function weddingStatusAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const projectId = String(formData.get("projectId") ?? "");
  const status = String(formData.get("status") ?? "") as WeddingStatus;
  await finish(`/admin/projects/${projectId}`, async () => {
    await updateDemoDb((db) => {
      setWeddingStatus(
        db,
        session.staffId,
        {
          projectId,
          status,
          commitmentStart: String(formData.get("commitmentStart") ?? "") || undefined,
          commitmentEnd: String(formData.get("commitmentEnd") ?? "") || undefined,
        },
        new Date().toISOString(),
      );
    });
  }, "#pipeline");
}

export async function holdAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const projectId = String(formData.get("projectId") ?? "");
  await finish(`/admin/projects/${projectId}`, async () => {
    const expiresOn = String(formData.get("expiresOn") ?? "");
    const expires = chicagoDayInterval(expiresOn).end.toUTC().toISO();
    await updateDemoDb((db) => {
      addCommitment(
        db,
        session.staffId,
        {
          projectId,
          kind: "hold",
          status: "hold",
          startDate: String(formData.get("startDate") ?? ""),
          endDate: String(formData.get("endDate") ?? ""),
          expiresAt: expires,
          internalLabel: "Wedding hold",
        },
        new Date().toISOString(),
      );
    });
  }, "#pipeline");
}

export async function resolveTaskAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const projectId = String(formData.get("projectId") ?? "");
  const taskId = String(formData.get("taskId") ?? "");
  await finish(`/admin/projects/${projectId}`, async () => {
    await updateDemoDb((db) => {
      resolveTask(db, session.staffId, taskId, new Date().toISOString());
    });
  }, "#tasks");
}

export async function releaseDayAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const projectId = String(formData.get("projectId") ?? "");
  const appointmentId = String(formData.get("appointmentId") ?? "");
  await finish(`/admin/projects/${projectId}`, async () => {
    await updateDemoDb((db) => {
      releaseUnconfirmedDay(db, session.staffId, appointmentId, new Date().toISOString());
    });
  });
}

const MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
};

async function readUpload(file: File): Promise<{
  bytes: Buffer;
  ext: string;
  contentType: string;
  fileName: string;
}> {
  if (file.size > 8 * 1024 * 1024) {
    throw new DomainError("Photos need to be under 8 MB.");
  }
  const ext = MIME[file.type];
  if (!ext) throw new DomainError("Upload a JPG, PNG, WEBP, GIF, or SVG.");
  return {
    bytes: Buffer.from(await file.arrayBuffer()),
    ext,
    contentType: file.type,
    fileName: file.name.replace(/[^\w.\- ]+/g, "").slice(0, 80) || `photo${ext}`,
  };
}

function writeAsset(
  db: Parameters<typeof addAsset>[0],
  input: {
    clientId: string;
    projectId: string;
    kind: "current_hair" | "inspiration";
    bytes: Buffer;
    ext: string;
    contentType: string;
    fileName: string;
  },
): void {
  const id = newId();
  const storagePath = `${input.clientId}/${id}${input.ext}`;
  const full = safeUploadPath(storagePath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, input.bytes);
  addAsset(db, {
    id,
    project_id: input.projectId,
    client_id: input.clientId,
    kind: input.kind,
    storage_path: storagePath,
    content_type: input.contentType,
    file_name: input.fileName,
  });
}
