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
import { useEffect, useMemo, useState } from "react";
import { flattenTree, hasChildren } from "@/lib/cardTree";
import { useBoard } from "@/lib/store/BoardContext";
import type { Card } from "@/lib/types";
import { STATUS_LABELS } from "@/lib/types";

const DAY_WIDTH = 28;
const LABEL_WIDTH = 280;

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

export function GanttView({ onOpenCard }: { onOpenCard: (c: Card) => void }) {
  const { cards } = useBoard();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

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

    const ranges = cards.map((c) => cardRange(c, addDays(today, -3), addDays(today, 14)));
    const earliest = minDate(ranges.map((r) => r.start));
    const latest = maxDate(ranges.map((r) => r.end));
    const start = addDays(earliest, -2);
    const end = addDays(latest, 5);
    const length = Math.max(differenceInCalendarDays(end, start) + 1, 14);
    const dayList = Array.from({ length }, (_, i) => addDays(start, i));

    const tree = flattenTree(cards, { expandedIds });
    const mapped = tree.map(({ card, depth }) => {
      const { start: s, end: e } = cardRange(card, start, end);
      const offset = differenceInCalendarDays(s, start);
      const span = Math.max(differenceInCalendarDays(e, s) + 1, 1);
      return { card, depth, offset, span };
    });

    return { timelineStart: start, days: dayList, rows: mapped };
  }, [cards, expandedIds]);

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

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--panel)]/90">
      <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-2">
        <p className="text-xs text-[var(--muted)]">
          Hierarchy: parents and nested subcards (indent = depth)
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
                    <button
                      type="button"
                      onClick={() => onOpenCard(card)}
                      className={`absolute top-1/2 -translate-y-1/2 rounded-md px-2 text-left text-[11px] font-medium text-white shadow-sm transition hover:brightness-110 ${barClass(
                        depth,
                        card.status,
                      )} ${depth === 0 ? "h-7" : "h-5 opacity-95"}`}
                      style={{
                        left: offset * DAY_WIDTH + 2,
                        width: Math.max(span * DAY_WIDTH - 4, DAY_WIDTH - 4),
                      }}
                      title={`${card.startDate ?? "?"} → ${card.dueDate ?? "?"}`}
                    >
                      <span className="block truncate">{card.title}</span>
                    </button>
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
