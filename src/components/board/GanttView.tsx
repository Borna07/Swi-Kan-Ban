"use client";

import {
  addDays,
  differenceInCalendarDays,
  format,
  max as maxDate,
  min as minDate,
  parseISO,
  startOfDay,
} from "date-fns";
import { useEffect, useMemo, useRef, useState } from "react";
import { flattenTree, hasChildren } from "@/lib/cardTree";
import { useBoard } from "@/lib/store/BoardContext";
import type { Card } from "@/lib/types";
import { STATUS_LABELS } from "@/lib/types";

const DAY_WIDTH = 28;
const LABEL_WIDTH = 280;

type DragMode = "move" | "resize-start" | "resize-end";

type DragState = {
  cardId: string;
  mode: DragMode;
  originX: number;
  originStart: string;
  originDue: string;
  draftStart: string;
  draftDue: string;
};

function toDateStr(d: Date): string {
  return format(startOfDay(d), "yyyy-MM-dd");
}

function cardRange(card: Card, fallbackStart: Date, fallbackEnd: Date) {
  const start = card.startDate
    ? parseISO(card.startDate)
    : card.dueDate
      ? parseISO(card.dueDate)
      : fallbackStart;
  const end = card.dueDate
    ? parseISO(card.dueDate)
    : card.startDate
      ? addDays(parseISO(card.startDate), 2)
      : fallbackEnd;
  return {
    start: startOfDay(start <= end ? start : end),
    end: startOfDay(end >= start ? end : start),
  };
}

function barClass(depth: number, status: Card["status"]) {
  if (status === "done") return "bg-[var(--muted)]";
  if (status === "blocked") return "bg-amber-700";
  if (depth === 0) return "bg-[var(--accent)]";
  if (depth === 1) return "bg-[#1f8a6d]";
  return "bg-[#3aa88a]";
}

function applyDrag(drag: DragState, clientX: number): { start: string; due: string } {
  const deltaDays = Math.round((clientX - drag.originX) / DAY_WIDTH);
  const originStart = parseISO(drag.originStart);
  const originDue = parseISO(drag.originDue);
  const span = Math.max(differenceInCalendarDays(originDue, originStart), 0);

  if (drag.mode === "move") {
    const start = addDays(originStart, deltaDays);
    const due = addDays(start, span);
    return { start: toDateStr(start), due: toDateStr(due) };
  }

  if (drag.mode === "resize-start") {
    let start = addDays(originStart, deltaDays);
    const due = originDue;
    if (start > due) start = due;
    return { start: toDateStr(start), due: toDateStr(due) };
  }

  // resize-end
  let due = addDays(originDue, deltaDays);
  const start = originStart;
  if (due < start) due = start;
  return { start: toDateStr(start), due: toDateStr(due) };
}

export function GanttView({ onOpenCard }: { onOpenCard: (c: Card) => void }) {
  const { cards, updateCard } = useBoard();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const movedRef = useRef(false);

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

  useEffect(() => {
    if (!drag) return;

    function onMove(e: PointerEvent) {
      const current = dragRef.current;
      if (!current) return;
      if (Math.abs(e.clientX - current.originX) > 3) movedRef.current = true;
      const next = applyDrag(current, e.clientX);
      const updated = { ...current, draftStart: next.start, draftDue: next.due };
      dragRef.current = updated;
      setDrag(updated);
    }

    async function onUp(e: PointerEvent) {
      const current = dragRef.current;
      dragRef.current = null;
      setDrag(null);
      if (!current) return;
      const next = applyDrag(current, e.clientX);
      if (
        next.start !== current.originStart ||
        next.due !== current.originDue
      ) {
        await updateCard(current.cardId, {
          startDate: next.start,
          dueDate: next.due,
        });
      }
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [drag, updateCard]);

  const { timelineStart, days, rows } = useMemo(() => {
    const today = startOfDay(new Date());
    if (cards.length === 0) {
      const start = addDays(today, -3);
      return {
        timelineStart: start,
        days: Array.from({ length: 21 }, (_, i) => addDays(start, i)),
        rows: [] as { card: Card; depth: number; offset: number; span: number }[],
      };
    }

    const effective = cards.map((c) => {
      if (drag && c.id === drag.cardId) {
        return { ...c, startDate: drag.draftStart, dueDate: drag.draftDue };
      }
      return c;
    });

    const ranges = effective.map((c) =>
      cardRange(c, addDays(today, -3), addDays(today, 14)),
    );
    const earliest = minDate(ranges.map((r) => r.start));
    const latest = maxDate(ranges.map((r) => r.end));
    const start = addDays(earliest, -2);
    const end = addDays(latest, 5);
    const length = Math.max(differenceInCalendarDays(end, start) + 1, 14);
    const dayList = Array.from({ length }, (_, i) => addDays(start, i));

    const tree = flattenTree(effective, { expandedIds });
    const mapped = tree.map(({ card, depth }) => {
      const { start: s, end: e } = cardRange(card, start, end);
      const offset = differenceInCalendarDays(s, start);
      const span = Math.max(differenceInCalendarDays(e, s) + 1, 1);
      return { card, depth, offset, span };
    });

    return { timelineStart: start, days: dayList, rows: mapped };
  }, [cards, expandedIds, drag]);

  const todayOffset = differenceInCalendarDays(startOfDay(new Date()), timelineStart);
  const chartWidth = days.length * DAY_WIDTH;

  function toggle(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function beginDrag(
    e: React.PointerEvent,
    card: Card,
    mode: DragMode,
    fallbackStart: Date,
    fallbackEnd: Date,
  ) {
    e.preventDefault();
    e.stopPropagation();
    const { start, end } = cardRange(card, fallbackStart, fallbackEnd);
    const state: DragState = {
      cardId: card.id,
      mode,
      originX: e.clientX,
      originStart: toDateStr(start),
      originDue: toDateStr(end),
      draftStart: toDateStr(start),
      draftDue: toDateStr(end),
    };
    movedRef.current = false;
    dragRef.current = state;
    setDrag(state);
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--panel)]/90">
      <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-2">
        <p className="text-xs text-[var(--muted)]">
          Drag a bar to move · drag edges to change length · hierarchy indented by depth
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded border border-[var(--line)] px-2 py-1 text-xs hover:bg-[var(--wash)]"
            onClick={() => {
              const next = new Set<string>();
              for (const c of cards) {
                if (hasChildren(cards, c.id)) next.add(c.id);
              }
              setExpandedIds(next);
            }}
          >
            Expand all
          </button>
          <button
            type="button"
            className="rounded border border-[var(--line)] px-2 py-1 text-xs hover:bg-[var(--wash)]"
            onClick={() => setExpandedIds(new Set())}
          >
            Collapse all
          </button>
        </div>
      </div>

      {drag ? (
        <div className="border-b border-[var(--accent)]/30 bg-[var(--accent-soft)] px-4 py-1.5 text-xs text-[var(--ink)]">
          Adjusting dates: <strong>{drag.draftStart}</strong> → <strong>{drag.draftDue}</strong>
        </div>
      ) : null}

      <div className="flex border-b border-[var(--line)]">
        <div
          className="shrink-0 border-r border-[var(--line)] px-4 py-3 font-display text-sm text-[var(--muted)]"
          style={{ width: LABEL_WIDTH }}
        >
          Card
        </div>
        <div className="overflow-x-auto">
          <div className="flex" style={{ width: chartWidth }}>
            {days.map((day) => (
              <div
                key={day.toISOString()}
                className="border-r border-[var(--line)] py-2 text-center text-[10px] text-[var(--muted)]"
                style={{ width: DAY_WIDTH }}
              >
                <div>{format(day, "d")}</div>
                <div className="uppercase tracking-wide">{format(day, "EEEEE")}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-h-[560px] overflow-auto">
        {rows.length === 0 ? (
          <p className="p-6 text-sm text-[var(--muted)]">No dated cards yet.</p>
        ) : (
          rows.map(({ card, depth, offset, span }) => {
            const kids = hasChildren(cards, card.id);
            const expanded = expandedIds.has(card.id);
            const isDragging = drag?.cardId === card.id;
            return (
              <div
                key={card.id}
                className="flex min-h-[48px] border-b border-[var(--line)] last:border-b-0"
              >
                <div
                  className="flex shrink-0 items-stretch border-r border-[var(--line)]"
                  style={{ width: LABEL_WIDTH }}
                >
                  {kids ? (
                    <button
                      type="button"
                      aria-label={expanded ? "Collapse" : "Expand"}
                      onClick={() => toggle(card.id)}
                      className="w-7 shrink-0 text-xs text-[var(--muted)] hover:bg-[var(--wash)]"
                    >
                      {expanded ? "▾" : "▸"}
                    </button>
                  ) : (
                    <span className="w-7 shrink-0" />
                  )}
                  <button
                    type="button"
                    onClick={() => onOpenCard(card)}
                    className="min-w-0 flex-1 py-2.5 pr-3 text-left hover:bg-[var(--wash)]"
                    style={{ paddingLeft: 4 + depth * 14 }}
                  >
                    <div
                      className={`truncate text-sm text-[var(--ink)] ${
                        depth === 0 ? "font-display" : ""
                      }`}
                    >
                      {depth > 0 ? (
                        <span className="mr-1 text-[var(--muted)]">└</span>
                      ) : null}
                      {card.title}
                    </div>
                    <div className="text-[11px] text-[var(--muted)]">
                      {STATUS_LABELS[card.status]}
                      {card.assignee ? ` · ${card.assignee}` : ""}
                      {" · "}
                      {card.startDate ?? "?"}→{card.dueDate ?? "?"}
                    </div>
                  </button>
                </div>
                <div className="relative overflow-x-auto">
                  <div className="relative h-full py-2.5" style={{ width: chartWidth }}>
                    {todayOffset >= 0 && todayOffset < days.length ? (
                      <div
                        className="pointer-events-none absolute bottom-0 top-0 w-px bg-[var(--accent)]/70"
                        style={{ left: todayOffset * DAY_WIDTH + DAY_WIDTH / 2 }}
                      />
                    ) : null}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        if (!movedRef.current) onOpenCard(card);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") onOpenCard(card);
                      }}
                      onPointerDown={(e) => {
                        if ((e.target as HTMLElement).dataset.handle) return;
                        beginDrag(e, card, "move", timelineStart, addDays(timelineStart, 14));
                      }}
                      className={`absolute top-1/2 -translate-y-1/2 select-none rounded-md px-2 text-left text-[11px] font-medium text-white shadow-sm ${barClass(
                        depth,
                        card.status,
                      )} ${depth === 0 ? "h-7" : "h-5 opacity-95"} ${
                        isDragging ? "z-10 ring-2 ring-white/70" : "hover:brightness-110"
                      } cursor-grab active:cursor-grabbing`}
                      style={{
                        left: offset * DAY_WIDTH + 2,
                        width: Math.max(span * DAY_WIDTH - 4, DAY_WIDTH - 4),
                      }}
                      title="Drag to move · edges to resize"
                    >
                      <span
                        data-handle="start"
                        onPointerDown={(e) =>
                          beginDrag(
                            e,
                            card,
                            "resize-start",
                            timelineStart,
                            addDays(timelineStart, 14),
                          )
                        }
                        className="absolute bottom-0 left-0 top-0 w-2 cursor-ew-resize rounded-l-md bg-black/15 hover:bg-black/30"
                        title="Resize start"
                      />
                      <span className="pointer-events-none block truncate px-1">
                        {card.title}
                      </span>
                      <span
                        data-handle="end"
                        onPointerDown={(e) =>
                          beginDrag(
                            e,
                            card,
                            "resize-end",
                            timelineStart,
                            addDays(timelineStart, 14),
                          )
                        }
                        className="absolute bottom-0 right-0 top-0 w-2 cursor-ew-resize rounded-r-md bg-black/15 hover:bg-black/30"
                        title="Resize end"
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
