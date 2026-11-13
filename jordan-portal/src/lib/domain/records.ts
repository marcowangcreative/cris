import { newId } from "@/lib/ids";
import type { AuditEvent, Database, Task } from "@/lib/types";

export function pushAudit(
  db: Database,
  input: Omit<AuditEvent, "id" | "metadata"> & {
    metadata?: AuditEvent["metadata"];
  },
): void {
  db.audit_events.push({
    id: newId(),
    metadata: {},
    ...input,
  });
}

export function pushTask(
  db: Database,
  input: Omit<Task, "id" | "status" | "resolved_at"> & { status?: Task["status"] },
): Task {
  const task: Task = {
    id: newId(),
    status: input.status ?? "open",
    resolved_at: null,
    project_id: input.project_id,
    appointment_id: input.appointment_id,
    kind: input.kind,
    detail: input.detail,
    created_at: input.created_at,
  };
  db.tasks.push(task);
  return task;
}
