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
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useMemo, useState } from "react";
import { childProgress, getChildren, getRoots, hasChildren } from "@/lib/cardTree";
import { avatarHue, formatBoardRange, initials } from "@/lib/format";
import { useBoard } from "@/lib/store/BoardContext";
import type { Card, CardStatus } from "@/lib/types";
import { STATUS_COLORS, STATUS_LABELS, STATUS_ORDER } from "@/lib/types";

function checklistProgress(card: Card) {
  const total = card.checklist?.length ?? 0;
  if (total === 0) return null;
  const done = card.checklist.filter((c) => c.done).length;
  return { done, total };
}

function CardFace({
  card,
  dragging,
  depth = 0,
  expanded,
  onToggle,
  childCount,
  childDone,
}: {
  card: Card;
  dragging?: boolean;
  depth?: number;
  expanded?: boolean;
  onToggle?: () => void;
  childCount?: number;
  childDone?: number;
}) {
  const chk = checklistProgress(card);
  const range = formatBoardRange(card.startDate, card.dueDate);
  const colors = STATUS_COLORS[card.status];

  return (
    <div
      className={`group relative overflow-hidden rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-card)] transition ${
        dragging
          ? "shadow-[var(--shadow-lift)] ring-2 ring-[var(--accent)]"
          : "hover:shadow-[var(--shadow-lift)]"
      } ${depth > 0 ? "bg-[var(--wash)]" : ""}`}
      style={{ marginLeft: depth * 12 }}
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-[3px]"
        style={{ background: colors.header }}
      />
      <div className="flex items-stretch pl-1">
        {childCount && childCount > 0 ? (
          <button
            type="button"
            aria-label={expanded ? "Unterkarten einklappen" : "Unterkarten ausklappen"}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onToggle?.();
            }}
            className="w-6 shrink-0 text-[10px] text-[var(--muted)] hover:bg-[var(--panel)]"
          >
            {expanded ? "▾" : "▸"}
          </button>
        ) : (
          <span className="w-2 shrink-0" />
        )}
        <div className="min-w-0 flex-1 px-2.5 py-2.5 text-left">
          <div className="flex items-start justify-between gap-2">
            <span className="text-[13px] font-semibold leading-snug text-[var(--ink)]">
              {card.title}
            </span>
            {card.assignee ? (
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                style={{ background: avatarHue(card.assignee) }}
                title={card.assignee}
              >
                {initials(card.assignee)}
              </span>
            ) : null}
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--muted)]">
            {chk ? (
              <span className="inline-flex items-center gap-1 rounded bg-[var(--panel)] px-1.5 py-0.5">
                <span aria-hidden>✓</span>
                <span className="tabular-nums">
                  {chk.done}/{chk.total}
                </span>
              </span>
            ) : null}
            {childCount && childCount > 0 ? (
              <span className="inline-flex items-center gap-1 rounded bg-[var(--panel)] px-1.5 py-0.5 tabular-nums">
                ▦ {childDone}/{childCount}
              </span>
            ) : null}
            {range ? (
              <span className="inline-flex items-center gap-1 rounded bg-[var(--panel)] px-1.5 py-0.5">
                {range}
              </span>
            ) : null}
            {card.labels[0] ? (
              <span
                className="rounded px-1.5 py-0.5 font-medium"
                style={{ background: colors.soft, color: colors.header }}
              >
                {card.labels[0]}
              </span>
            ) : null}
          </div>
        </div>
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
      <button type="button" className="block w-full text-left" onClick={() => onOpen(card)}>
        <CardFace
          card={card}
          depth={depth}
          expanded={expanded}
          onToggle={() => toggle(card.id)}
          childCount={progress.total}
          childDone={progress.done}
        />
      </button>
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
  const { cards } = useBoard();
  const kids = getChildren(cards, card.id);
  const progress = childProgress(cards, card.id);
  const expanded = expandedIds.has(card.id);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: "card", status: card.status },
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.35 : 1,
      }}
      className="flex flex-col gap-1.5 kb-fade-up"
    >
      <div
        className="cursor-grab touch-none active:cursor-grabbing"
        {...attributes}
        {...listeners}
        onClick={() => onOpen(card)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpen(card);
          }
        }}
      >
        <CardFace
          card={card}
          expanded={expanded}
          onToggle={() => toggle(card.id)}
          childCount={progress.total}
          childDone={progress.done}
        />
      </div>
      {expanded
        ? kids.map((child) => (
            <NestedBlock
              key={child.id}
              card={child}
              depth={1}
              onOpen={onOpen}
              expandedIds={expandedIds}
              toggle={toggle}
            />
          ))
        : null}
    </div>
  );
}

function Column({
  status,
  cards,
  onOpen,
  expandedIds,
  toggle,
  overId,
}: {
  status: CardStatus;
  cards: Card[];
  onOpen: (c: Card) => void;
  expandedIds: Set<string>;
  toggle: (id: string) => void;
  overId: string | null;
}) {
  const { createCard } = useBoard();
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    data: { type: "column", status },
  });
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);
  const colors = STATUS_COLORS[status];
  const highlight = isOver || overId === status;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const title = draft.trim();
    if (!title) return;
    const card = await createCard(title, null, { status });
    setDraft("");
    setAdding(false);
    onOpen(card);
  }

  return (
    <section
      ref={setNodeRef}
      className={`flex min-h-[520px] w-[280px] shrink-0 flex-col ${
        highlight ? "kb-drop-target rounded-[var(--radius)]" : ""
      }`}
    >
      <header
        className="mb-2 flex items-center gap-2 rounded-t-[var(--radius)] px-2.5 py-2 text-[13px] font-semibold"
        style={{ background: colors.header, color: colors.text }}
      >
        <span className="min-w-0 flex-1 truncate">{STATUS_LABELS[status]}</span>
        <span className="inline-flex items-center gap-1 rounded bg-black/15 px-1.5 py-0.5 text-[11px] tabular-nums">
          {cards.length}
        </span>
        <button
          type="button"
          aria-label={`Karte zu ${STATUS_LABELS[status]} hinzufügen`}
          onClick={() => setAdding(true)}
          className="flex h-6 w-6 items-center justify-center rounded hover:bg-black/15"
        >
          +
        </button>
      </header>

      <div
        className={`flex flex-1 flex-col gap-2 rounded-b-[var(--radius)] bg-[var(--panel)]/60 p-1.5 ${
          highlight ? "bg-[var(--accent-soft)]/50" : ""
        }`}
      >
        <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <SortableRoot
              key={card.id}
              card={card}
              onOpen={onOpen}
              expandedIds={expandedIds}
              toggle={toggle}
            />
          ))}
        </SortableContext>

        {adding ? (
          <form
            onSubmit={(e) => void submit(e)}
            className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface)] p-2.5 shadow-[var(--shadow-card)]"
          >
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
              Kartenname
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="mt-1 w-full rounded-[var(--radius)] border border-[var(--line-strong)] px-2 py-1.5 text-sm outline-none focus:border-[var(--accent)]"
                placeholder="Titel…"
              />
            </label>
            <div className="mt-2 flex gap-2">
              <button
                type="submit"
                className="rounded-[var(--radius)] bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
              >
                Karte erstellen
              </button>
              <button
                type="button"
                onClick={() => {
                  setAdding(false);
                  setDraft("");
                }}
                className="rounded-[var(--radius)] px-3 py-1.5 text-sm text-[var(--muted)] hover:bg-[var(--wash)]"
              >
                Abbrechen
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="rounded-[var(--radius)] px-2 py-2 text-left text-[12px] text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--ink)]"
          >
            + Karte hinzufügen
          </button>
        )}
      </div>
    </section>
  );
}

function resolveDropStatus(overId: string, cards: Card[]): CardStatus | undefined {
  if (STATUS_ORDER.includes(overId as CardStatus)) return overId as CardStatus;
  return cards.find((c) => c.id === overId)?.status;
}

export function KanbanView({
  onOpenCard,
  searchQuery = "",
}: {
  onOpenCard: (c: Card) => void;
  searchQuery?: string;
}) {
  const { cards, moveCard } = useBoard();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    for (const c of cards) {
      if (hasChildren(cards, c.id)) initial.add(c.id);
    }
    return initial;
  });
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

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

  const q = searchQuery.trim().toLowerCase();

  const rootsByStatus = useMemo(() => {
    const map: Record<CardStatus, Card[]> = {
      blocked: [],
      todo: [],
      doing: [],
      done: [],
    };
    for (const card of getRoots(cards)) {
      if (q && !card.title.toLowerCase().includes(q)) continue;
      map[card.status].push(card);
    }
    return map;
  }, [cards, q]);

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

  function onDragOver(e: DragOverEvent) {
    const overId = e.over ? String(e.over.id) : null;
    if (!overId) {
      setOverColumn(null);
      return;
    }
    const status = resolveDropStatus(overId, cards);
    setOverColumn(status ?? null);
  }

  async function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    setOverColumn(null);
    const { active, over } = e;
    if (!over) return;
    const cardId = String(active.id);
    const nextStatus = resolveDropStatus(String(over.id), cards);
    if (!nextStatus) return;
    const card = cards.find((c) => c.id === cardId);
    if (!card || card.status === nextStatus) return;
    await moveCard(cardId, nextStatus);
  }

  function onDragCancel() {
    setActiveId(null);
    setOverColumn(null);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      <div className="flex gap-3 overflow-x-auto pb-6 pt-1">
        {STATUS_ORDER.map((status) => (
          <Column
            key={status}
            status={status}
            cards={rootsByStatus[status]}
            onOpen={onOpenCard}
            expandedIds={expandedIds}
            toggle={toggle}
            overId={overColumn}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={{ duration: 180, easing: "ease" }}>
        {activeCard ? (
          <div className="w-[260px] rotate-[1.5deg] cursor-grabbing">
            <CardFace card={activeCard} dragging />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
