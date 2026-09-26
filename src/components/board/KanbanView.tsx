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
import { useEffect, useMemo, useState } from "react";
import { childProgress, getChildren, getRoots, hasChildren } from "@/lib/cardTree";
import { useBoard } from "@/lib/store/BoardContext";
import type { Card, CardStatus } from "@/lib/types";
import { STATUS_LABELS, STATUS_ORDER } from "@/lib/types";

function CardChip({
  card,
  onOpen,
  dragging,
  depth = 0,
  expanded,
  onToggle,
  childCount,
  childDone,
}: {
  card: Card;
  onOpen: (c: Card) => void;
  dragging?: boolean;
  depth?: number;
  expanded?: boolean;
  onToggle?: () => void;
  childCount?: number;
  childDone?: number;
}) {
  return (
    <div
      className={`rounded-lg border border-[var(--line)] bg-[var(--surface)] shadow-[0_1px_0_rgba(18,36,48,0.04)] transition hover:border-[var(--accent)] ${
        dragging ? "opacity-80 ring-2 ring-[var(--accent)]" : ""
      } ${depth > 0 ? "border-dashed bg-[var(--panel)]" : ""}`}
      style={{ marginLeft: depth * 14 }}
    >
      <div className="flex items-stretch">
        {childCount && childCount > 0 ? (
          <button
            type="button"
            aria-label={expanded ? "Collapse subcards" : "Expand subcards"}
            onClick={(e) => {
              e.stopPropagation();
              onToggle?.();
            }}
            className="w-7 shrink-0 border-r border-[var(--line)] text-xs text-[var(--muted)] hover:bg-[var(--wash)]"
          >
            {expanded ? "▾" : "▸"}
          </button>
        ) : (
          <span className="w-2 shrink-0" />
        )}
        <button
          type="button"
          onClick={() => onOpen(card)}
          className="min-w-0 flex-1 px-3 py-2.5 text-left"
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
            <span>
              {card.assignee ?? "Unassigned"}
              {childCount && childCount > 0 ? (
                <span className="ml-2 tabular-nums text-[var(--accent)]">
                  {childDone}/{childCount} sub
                </span>
              ) : null}
            </span>
            <span>{card.dueDate ?? "No due"}</span>
          </div>
        </button>
      </div>
    </div>
  );
}

function NestedBlock({
  card,
  depth,
  onOpen,
  expandedIds,
  toggle,
}: {
  card: Card;
  depth: number;
  onOpen: (c: Card) => void;
  expandedIds: Set<string>;
  toggle: (id: string) => void;
}) {
  const { cards } = useBoard();
  const kids = getChildren(cards, card.id);
  const progress = childProgress(cards, card.id);
  const expanded = expandedIds.has(card.id);

  return (
    <div className="flex flex-col gap-1.5">
      <CardChip
        card={card}
        onOpen={onOpen}
        depth={depth}
        expanded={expanded}
        onToggle={() => toggle(card.id)}
        childCount={progress.total}
        childDone={progress.done}
      />
      {expanded
        ? kids.map((child) => (
            <NestedBlock
              key={child.id}
              card={child}
              depth={depth + 1}
              onOpen={onOpen}
              expandedIds={expandedIds}
              toggle={toggle}
            />
          ))
        : null}
    </div>
  );
}

function SortableRoot({
  card,
  onOpen,
  expandedIds,
  toggle,
}: {
  card: Card;
  onOpen: (c: Card) => void;
  expandedIds: Set<string>;
  toggle: (id: string) => void;
}) {
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
      className="relative"
    >
      <button
        type="button"
        className="absolute left-0 top-2 z-10 flex h-7 w-5 cursor-grab items-center justify-center rounded text-[10px] text-[var(--muted)] hover:bg-[var(--wash)] active:cursor-grabbing"
        aria-label="Drag card"
        {...attributes}
        {...listeners}
      >
        ⋮⋮
      </button>
      <div className="pl-4">
        <NestedBlock
          card={card}
          depth={0}
          onOpen={onOpen}
          expandedIds={expandedIds}
          toggle={toggle}
        />
      </div>
    </div>
  );
}

function Column({
  status,
  cards,
  onOpen,
  expandedIds,
  toggle,
}: {
  status: CardStatus;
  cards: Card[];
  onOpen: (c: Card) => void;
  expandedIds: Set<string>;
  toggle: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <section
      ref={setNodeRef}
      className={`flex min-h-[420px] w-[300px] shrink-0 flex-col rounded-xl border border-[var(--line)] bg-[var(--panel)]/80 p-3 ${
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
            <SortableRoot
              key={card.id}
              card={card}
              onOpen={onOpen}
              expandedIds={expandedIds}
              toggle={toggle}
            />
          ))}
        </div>
      </SortableContext>
    </section>
  );
}

export function KanbanView({ onOpenCard }: { onOpenCard: (c: Card) => void }) {
  const { cards, moveCard } = useBoard();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    for (const c of cards) {
      if (hasChildren(cards, c.id)) initial.add(c.id);
    }
    return initial;
  });
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  // Expand parents that have children on first load of a card set
  useEffect(() => {
    setExpandedIds((prev) => {
      if (prev.size > 0) return prev;
      const next = new Set<string>();
      for (const c of cards) {
        if (hasChildren(cards, c.id)) next.add(c.id);
      }
      return next;
    });
  }, [cards]);

  const rootsByStatus = useMemo(() => {
    const map: Record<CardStatus, Card[]> = {
      todo: [],
      doing: [],
      done: [],
      blocked: [],
    };
    for (const card of getRoots(cards)) map[card.status].push(card);
    return map;
  }, [cards]);

  const activeCard = cards.find((c) => c.id === activeId) ?? null;

  function toggle(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

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
            cards={rootsByStatus[status]}
            onOpen={onOpenCard}
            expandedIds={expandedIds}
            toggle={toggle}
          />
        ))}
      </div>
      <DragOverlay>
        {activeCard ? <CardChip card={activeCard} onOpen={() => undefined} dragging /> : null}
      </DragOverlay>
    </DndContext>
  );
}
