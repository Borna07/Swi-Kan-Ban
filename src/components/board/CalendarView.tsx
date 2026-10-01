"use client";

import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { useMemo, useState } from "react";
import { useBoard } from "@/lib/store/BoardContext";
import type { Card } from "@/lib/types";

export function CalendarView({ onOpenCard }: { onOpenCard: (c: Card) => void }) {
  const { cards } = useBoard();
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const byDate = useMemo(() => {
    const map = new Map<string, Card[]>();
    for (const card of cards) {
      if (!card.dueDate) continue;
      const key = card.dueDate.slice(0, 10);
      const list = map.get(key) ?? [];
      list.push(card);
      map.set(key, list);
    }
    return map;
  }, [cards]);

  const today = new Date();

  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)]/90 p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="font-display text-xl text-[var(--ink)]">
          {format(cursor, "MMMM yyyy")}
        </h3>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-md border border-[var(--line)] px-3 py-1.5 text-sm text-[var(--ink)] hover:bg-[var(--wash)]"
            onClick={() => setCursor((d) => startOfMonth(addDays(d, -15)))}
          >
            Prev
          </button>
          <button
            type="button"
            className="rounded-md border border-[var(--line)] px-3 py-1.5 text-sm text-[var(--ink)] hover:bg-[var(--wash)]"
            onClick={() => setCursor(startOfMonth(new Date()))}
          >
            Today
          </button>
          <button
            type="button"
            className="rounded-md border border-[var(--line)] px-3 py-1.5 text-sm text-[var(--ink)] hover:bg-[var(--wash)]"
            onClick={() => setCursor((d) => startOfMonth(addDays(endOfMonth(d), 1)))}
          >
            Next
          </button>
        </div>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayCards = byDate.get(key) ?? [];
          const inMonth = isSameMonth(day, cursor);
          const isToday = isSameDay(day, today);
          return (
            <div
              key={key}
              className={`min-h-[108px] rounded-lg border border-[var(--line)] p-1.5 ${
                inMonth ? "bg-[var(--surface)]" : "bg-[var(--wash)]/50 opacity-60"
              } ${isToday ? "border-[var(--accent)]" : ""}`}
            >
              <div
                className={`mb-1 text-xs tabular-nums ${
                  isToday ? "font-semibold text-[var(--accent)]" : "text-[var(--muted)]"
                }`}
              >
                {format(day, "d")}
              </div>
              <div className="flex flex-col gap-1">
                {dayCards.slice(0, 3).map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => onOpenCard(card)}
                    className="truncate rounded bg-[var(--accent-soft)] px-1.5 py-0.5 text-left text-[11px] text-[var(--ink)] hover:bg-[var(--accent)] hover:text-white"
                    title={card.title}
                  >
                    {card.title}
                  </button>
                ))}
                {dayCards.length > 3 ? (
                  <span className="px-1 text-[10px] text-[var(--muted)]">
                    +{dayCards.length - 3} more
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
