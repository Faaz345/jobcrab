"use client";

import { useState } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { toast } from "sonner";
import { KanbanCard, type AppCard } from "./kanban-card";

const COLUMNS: { id: string; label: string; color: string }[] = [
  { id: "discovered", label: "Discovered", color: "text-blue-400" },
  { id: "resume_tailored", label: "Resume Tailored", color: "text-purple-400" },
  { id: "email_sent", label: "Email Sent", color: "text-amber-400" },
  { id: "response_received", label: "Response", color: "text-emerald-400" },
  { id: "interview", label: "Interview", color: "text-cyan-400" },
  { id: "offer", label: "Offer", color: "text-green-400" },
];

export function KanbanBoard({ initialApps }: { initialApps: AppCard[] }) {
  const [apps, setApps] = useState<AppCard[]>(initialApps);

  const byColumn = (status: string) => apps.filter((a) => a.status === status);

  async function onDragEnd(result: DropResult) {
    const { draggableId, destination, source } = result;
    if (!destination || destination.droppableId === source.droppableId) return;

    const newStatus = destination.droppableId;
    const prev = apps;
    // optimistic update
    setApps((cur) =>
      cur.map((a) => (a.id === draggableId ? { ...a, status: newStatus } : a))
    );

    try {
      const res = await fetch(`/api/applications/${draggableId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Status updated");
    } catch {
      setApps(prev); // revert
      toast.error("Failed to update status");
    }
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((col) => {
          const cards = byColumn(col.id);
          return (
            <Droppable droppableId={col.id} key={col.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`flex w-[80vw] max-w-[18rem] sm:w-72 shrink-0 flex-col rounded-xl border p-3 transition-colors ${
                    snapshot.isDraggingOver
                      ? "border-primary/50 bg-primary/5"
                      : "border-border/50 bg-muted/20"
                  }`}
                >
                  <div className="mb-3 flex items-center justify-between px-1">
                    <span className={`text-sm font-semibold ${col.color}`}>
                      {col.label}
                    </span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      {cards.length}
                    </span>
                  </div>
                  <div className="flex min-h-[120px] flex-col gap-2.5">
                    {cards.map((app, index) => (
                      <Draggable draggableId={app.id} index={index} key={app.id}>
                        {(dp, ds) => (
                          <div
                            ref={dp.innerRef}
                            {...(dp.draggableProps as unknown as Record<string, unknown>)}
                            {...(dp.dragHandleProps as unknown as Record<string, unknown>)}
                          >
                            <KanbanCard app={app} dragging={ds.isDragging} />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {cards.length === 0 && (
                      <div className="flex h-24 items-center justify-center text-xs text-muted-foreground/60">
                        Drop here
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Droppable>
          );
        })}
      </div>
    </DragDropContext>
  );
}
