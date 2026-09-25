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
import { useMemo } from "react";
import { useBoard } from "@/lib/store/BoardContext";
import type { Card } from "@/lib/types";
import { STATUS_LABELS } from "@/lib/types";

const DAY_WIDTH = 28;

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

export function GanttView({ onOpenCard }: { onOpenCard: (c: Card) => void }) {
  const { cards } = useBoard();

  const { timelineStart, days, rows } = useMemo(() => {
    const today = startOfDay(new Date());
    if (cards.length === 0) {
      const start = addDays(today, -3);
      return {
        timelineStart: start,
        days: Array.from({ length: 21 }, (_, i) => addDays(start, i)),
        rows: [] as { card: Card; offset: number; span: number }[],
      };
    }

    const ranges = cards.map((c) => cardRange(c, addDays(today, -3), addDays(today, 14)));
    const earliest = minDate(ranges.map((r) => r.start));
    const latest = maxDate(ranges.map((r) => r.end));
    const start = addDays(earliest, -2);
    const end = addDays(latest, 5);
    const length = Math.max(differenceInCalendarDays(end, start) + 1, 14);
    const dayList = Array.from({ length }, (_, i) => addDays(start, i));

    const mapped = cards
      .map((card) => {
        const { start: s, end: e } = cardRange(card, start, end);
        const offset = differenceInCalendarDays(s, start);
        const span = Math.max(differenceInCalendarDays(e, s) + 1, 1);
        return { card, offset, span };
      })
      .sort((a, b) => a.offset - b.offset || a.card.title.localeCompare(b.card.title));

    return { timelineStart: start, days: dayList, rows: mapped };
  }, [cards]);

  const todayOffset = differenceInCalendarDays(startOfDay(new Date()), timelineStart);
  const chartWidth = days.length * DAY_WIDTH;

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--panel)]/90">
      <div className="flex border-b border-[var(--line)]">
        <div className="w-[240px] shrink-0 border-r border-[var(--line)] px-4 py-3 font-display text-sm text-[var(--muted)]">
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
          rows.map(({ card, offset, span }) => (
            <div
              key={card.id}
              className="flex min-h-[52px] border-b border-[var(--line)] last:border-b-0"
            >
              <button
                type="button"
                onClick={() => onOpenCard(card)}
                className="w-[240px] shrink-0 border-r border-[var(--line)] px-4 py-3 text-left hover:bg-[var(--wash)]"
              >
                <div className="truncate font-display text-sm text-[var(--ink)]">
                  {card.title}
                </div>
                <div className="text-[11px] text-[var(--muted)]">
                  {STATUS_LABELS[card.status]}
                  {card.assignee ? ` · ${card.assignee}` : ""}
                </div>
              </button>
              <div className="relative overflow-x-auto">
                <div className="relative h-full py-3" style={{ width: chartWidth }}>
                  {todayOffset >= 0 && todayOffset < days.length ? (
                    <div
                      className="pointer-events-none absolute bottom-0 top-0 w-px bg-[var(--accent)]/70"
                      style={{ left: todayOffset * DAY_WIDTH + DAY_WIDTH / 2 }}
                    />
                  ) : null}
                  <button
                    type="button"
                    onClick={() => onOpenCard(card)}
                    className="absolute top-1/2 h-7 -translate-y-1/2 rounded-md bg-[var(--accent)] px-2 text-left text-[11px] font-medium text-white shadow-sm transition hover:brightness-110"
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
          ))
        )}
      </div>
    </div>
  );
}
