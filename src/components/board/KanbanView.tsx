"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMemo, useState } from "react";
import { useBoard } from "@/lib/store/BoardContext";
import type { Card, CardStatus } from "@/lib/types";
import { STATUS_LABELS, STATUS_ORDER } from "@/lib/types";

function CardChip({
  card,
  onOpen,
  dragging,
}: {
  card: Card;
  onOpen: (c: Card) => void;
  dragging?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(card)}
      className={`w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-left shadow-[0_1px_0_rgba(18,36,48,0.04)] transition hover:border-[var(--accent)] ${
        dragging ? "opacity-80 ring-2 ring-[var(--accent)]" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-display text-[15px] leading-snug text-[var(--ink)]">
          {card.title}
        </span>
        {card.labels[0] ? (
          <span className="shrink-0 rounded bg-[var(--wash)] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[var(--muted)]">
            {card.labels[0]}
          </span>
        ) : null}
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-[var(--muted)]">
        <span>{card.assignee ?? "Unassigned"}</span>
        <span>{card.dueDate ?? "No due"}</span>
      </div>
    </button>
  );
}

function SortableCard({ card, onOpen }: { card: Card; onOpen: (c: Card) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { status: card.status },
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.35 : 1,
      }}
      className="touch-none"
      {...attributes}
      {...listeners}
    >
      <CardChip card={card} onOpen={onOpen} />
    </div>
  );
}

function Column({
  status,
  cards,
  onOpen,
}: {
  status: CardStatus;
  cards: Card[];
  onOpen: (c: Card) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <section
      ref={setNodeRef}
      className={`flex min-h-[420px] w-[280px] shrink-0 flex-col rounded-xl border border-[var(--line)] bg-[var(--panel)]/80 p-3 ${
        isOver ? "border-[var(--accent)] bg-[var(--wash)]" : ""
      }`}
    >
      <header className="mb-3 flex items-baseline justify-between px-1">
        <h3 className="font-display text-sm tracking-wide text-[var(--ink)]">
          {STATUS_LABELS[status]}
        </h3>
        <span className="text-xs tabular-nums text-[var(--muted)]">{cards.length}</span>
      </header>
      <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-1 flex-col gap-2">
          {cards.map((card) => (
            <SortableCard key={card.id} card={card} onOpen={onOpen} />
          ))}
        </div>
      </SortableContext>
    </section>
  );
}

export function KanbanView({ onOpenCard }: { onOpenCard: (c: Card) => void }) {
  const { cards, moveCard } = useBoard();
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const byStatus = useMemo(() => {
    const map: Record<CardStatus, Card[]> = {
      todo: [],
      doing: [],
      done: [],
      blocked: [],
    };
    for (const card of cards) map[card.status].push(card);
    return map;
  }, [cards]);

  const activeCard = cards.find((c) => c.id === activeId) ?? null;

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  async function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const cardId = String(active.id);
    const overId = String(over.id);
    const nextStatus = (
      STATUS_ORDER.includes(overId as CardStatus)
        ? overId
        : cards.find((c) => c.id === overId)?.status
    ) as CardStatus | undefined;
    if (!nextStatus) return;
    const card = cards.find((c) => c.id === cardId);
    if (!card || card.status === nextStatus) return;
    await moveCard(cardId, nextStatus);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-4">
        {STATUS_ORDER.map((status) => (
          <Column
            key={status}
            status={status}
            cards={byStatus[status]}
            onOpen={onOpenCard}
          />
        ))}
      </div>
      <DragOverlay>
        {activeCard ? <CardChip card={activeCard} onOpen={() => undefined} dragging /> : null}
      </DragOverlay>
    </DndContext>
  );
}
