"use client";

import { useStudio } from "./auth-provider";
import { EventEditor } from "./event-editor";
import { StudioGate } from "./studio-gate";

export function EventScreen({ id }: { id: string }) {
  return (
    <StudioGate>
      <Editor id={id} />
    </StudioGate>
  );
}

function Editor({ id }: { id: string }) {
  const studio = useStudio();
  const event = studio.events.find((item) => item.id === id);
  if (!event) {
    return (
      <main className="page">
        <div className="empty card">
          <h2>Event not found</h2>
          <p className="lede">It may have been deleted, or it belongs to another studio.</p>
        </div>
      </main>
    );
  }
  return (
    <EventEditor
      key={event.id}
      initial={event}
      stylists={studio.stylists}
      onSave={studio.saveEvent}
      onDelete={studio.deleteEvent}
      onSaveStylist={studio.saveStylist}
      onDeleteStylist={studio.deleteStylist}
    />
  );
}
