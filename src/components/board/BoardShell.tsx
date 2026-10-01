"use client";

import { addDays, format, startOfWeek } from "date-fns";
import { de } from "date-fns/locale";
import { useMemo, useState } from "react";
import { DEMO_SPACE } from "@/lib/demoData";
import { useBoard } from "@/lib/store/BoardContext";
import type { Card, SpaceView } from "@/lib/types";
import { CalendarView } from "./CalendarView";
import { CardDrawer } from "./CardDrawer";
import { GanttView } from "./GanttView";
import { KanbanView } from "./KanbanView";

const VIEWS: { id: SpaceView; label: string }[] = [
  { id: "kanban", label: "Kanban" },
  { id: "calendar", label: "Kalender" },
  { id: "gantt", label: "Gantt" },
];

function TimelineStrip() {
  const today = useMemo(() => new Date(), []);
  const start = startOfWeek(today, { weekStartsOn: 1 });
  const days = useMemo(
    () => Array.from({ length: 42 }, (_, i) => addDays(start, i - 7)),
    [start],
  );

  return (
    <div className="overflow-x-auto border-b border-[var(--line)] bg-[var(--surface)]">
      <div className="flex min-w-max items-end gap-0 px-3 py-2">
        {days.map((d) => {
          const isToday =
            format(d, "yyyy-MM-dd") === format(today, "yyyy-MM-dd");
          const isMonthStart = d.getDate() === 1 || days[0] === d;
          return (
            <div key={d.toISOString()} className="w-10 shrink-0 text-center">
              {isMonthStart ? (
                <div className="mb-1 text-[10px] font-semibold uppercase text-[var(--muted)]">
                  {format(d, "MMMM", { locale: de })}
                </div>
              ) : (
                <div className="mb-1 h-[14px]" />
              )}
              <div
                className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full text-[11px] ${
                  isToday
                    ? "bg-[var(--accent)] font-semibold text-white"
                    : "text-[var(--muted)]"
                }`}
              >
                {format(d, "d")}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function BoardShell() {
  const {
    view,
    setView,
    loading,
    error,
    backend,
    sharePointReady,
    signedIn,
    accountName,
    createCard,
    signIn,
    signOut,
    switchToLocal,
    refresh,
  } = useBoard();
  const [openCard, setOpenCard] = useState<Card | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [search, setSearch] = useState("");

  async function addCard(e: React.FormEvent) {
    e.preventDefault();
    const title = draftTitle.trim();
    if (!title) return;
    const card = await createCard(title);
    setDraftTitle("");
    setOpenCard(card);
  }

  return (
    <div className="flex min-h-screen bg-[var(--panel)] text-[var(--ink)]">
      {/* Left icon rail — KanBo chrome */}
      <aside className="flex w-12 shrink-0 flex-col items-center gap-3 border-r border-[var(--line)] bg-[var(--surface)] py-3">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-[var(--radius)] bg-[var(--brand)] text-sm font-bold text-[var(--ink)]"
          title="Swi-Kan-Ban"
        >
          K
        </div>
        <nav className="flex flex-1 flex-col items-center gap-1 text-[var(--muted)]">
          <span className="flex h-8 w-8 items-center justify-center rounded hover:bg-[var(--panel)]" title="Home">
            ⌂
          </span>
          <span className="flex h-8 w-8 items-center justify-center rounded hover:bg-[var(--panel)]" title="Suchen">
            ⌕
          </span>
          <span className="flex h-8 w-8 items-center justify-center rounded bg-[var(--accent-soft)] text-[var(--accent)]" title="Board">
            ▦
          </span>
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-[var(--line)] bg-[var(--surface)]">
          <div className="flex flex-wrap items-center gap-3 px-4 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] text-[var(--muted)]">
                Swi-Kan-Ban / {DEMO_SPACE.name}
              </p>
              <h1 className="truncate text-base font-semibold text-[var(--ink)]">
                {DEMO_SPACE.name}
              </h1>
            </div>

            <label className="relative hidden min-w-[200px] flex-1 md:block md:max-w-xs">
              <span className="sr-only">Suchen</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Suchen…"
                className="w-full rounded-[var(--radius)] border border-[var(--line-strong)] bg-[var(--wash)] px-3 py-1.5 text-sm outline-none focus:border-[var(--accent)]"
              />
            </label>

            <div className="flex flex-wrap items-center gap-1 text-sm text-[var(--muted)]">
              <span className="hidden rounded px-2 py-1 hover:bg-[var(--panel)] lg:inline">
                Aktivitäten
              </span>
              <span className="hidden rounded px-2 py-1 hover:bg-[var(--panel)] lg:inline">
                Benutzer
              </span>
              <span className="hidden rounded px-2 py-1 hover:bg-[var(--panel)] sm:inline">
                Dokumente
              </span>
              <span className="rounded px-2 py-1 text-xs text-[var(--muted)]">
                {backend === "sharepoint" ? "SharePoint" : "Lokal"}
              </span>
              {sharePointReady ? (
                signedIn ? (
                  <button
                    type="button"
                    onClick={() => void signOut()}
                    className="rounded-[var(--radius)] border border-[var(--line)] px-2.5 py-1.5 text-sm hover:bg-[var(--panel)]"
                    title={accountName ?? undefined}
                  >
                    Abmelden
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void signIn()}
                    className="rounded-[var(--radius)] bg-[var(--accent)] px-2.5 py-1.5 text-sm text-white hover:bg-[var(--accent-hover)]"
                  >
                    Mit Microsoft anmelden
                  </button>
                )
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 px-4">
            <nav className="flex gap-0" aria-label="Ansichten">
              {VIEWS.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setView(v.id)}
                  aria-pressed={view === v.id}
                  data-view={v.id}
                  className={`border-b-2 px-3 py-2 text-sm transition ${
                    view === v.id
                      ? "border-[var(--accent)] font-semibold text-[var(--accent)]"
                      : "border-transparent text-[var(--muted)] hover:text-[var(--ink)]"
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </nav>
            <button
              type="button"
              onClick={() => void refresh()}
              className="mb-1 rounded-[var(--radius)] border border-[var(--line)] px-2.5 py-1 text-xs text-[var(--muted)] hover:bg-[var(--panel)]"
            >
              Aktualisieren
            </button>
          </div>
        </header>

        {view === "kanban" ? <TimelineStrip /> : null}

        <main className="min-h-0 flex-1 overflow-auto px-4 py-4">
          {view === "kanban" ? (
            <form
              onSubmit={(e) => void addCard(e)}
              className="mb-3 flex flex-wrap items-center gap-2"
            >
              <input
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                placeholder="Schnelle Karte…"
                className="min-w-[180px] flex-1 rounded-[var(--radius)] border border-[var(--line-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)] md:max-w-sm"
              />
              <button
                type="submit"
                className="rounded-[var(--radius)] bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
              >
                Karte erstellen
              </button>
            </form>
          ) : null}

          {error ? (
            <div className="mb-4 flex flex-wrap items-center gap-3 rounded-[var(--radius)] border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              <span className="flex-1">{error}</span>
              {backend === "sharepoint" ? (
                <button type="button" className="underline" onClick={() => switchToLocal()}>
                  Lokale Demo nutzen
                </button>
              ) : null}
            </div>
          ) : null}

          {loading ? (
            <p className="text-sm text-[var(--muted)]">Karten werden geladen…</p>
          ) : view === "kanban" ? (
            <KanbanView onOpenCard={setOpenCard} searchQuery={search} />
          ) : view === "calendar" ? (
            <CalendarView onOpenCard={setOpenCard} />
          ) : (
            <GanttView onOpenCard={setOpenCard} />
          )}
        </main>
      </div>

      <CardDrawer card={openCard} onClose={() => setOpenCard(null)} onOpenCard={setOpenCard} />
    </div>
  );
}
