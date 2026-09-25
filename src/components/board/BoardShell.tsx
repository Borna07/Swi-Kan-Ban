"use client";

import { useState } from "react";
import { DEMO_SPACE } from "@/lib/demoData";
import { useBoard } from "@/lib/store/BoardContext";
import type { Card, SpaceView } from "@/lib/types";
import { CalendarView } from "./CalendarView";
import { CardDrawer } from "./CardDrawer";
import { GanttView } from "./GanttView";
import { KanbanView } from "./KanbanView";

const VIEWS: { id: SpaceView; label: string }[] = [
  { id: "kanban", label: "Kanban" },
  { id: "calendar", label: "Calendar" },
  { id: "gantt", label: "Gantt" },
];

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

  async function addCard(e: React.FormEvent) {
    e.preventDefault();
    const title = draftTitle.trim();
    if (!title) return;
    const card = await createCard(title);
    setDraftTitle("");
    setOpenCard(card);
  }

  return (
    <div className="min-h-screen text-[var(--ink)]">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_#d9efe6_0%,_transparent_55%),radial-gradient(ellipse_at_bottom_right,_#e7eef5_0%,_transparent_50%),linear-gradient(160deg,#f4f7f5_0%,#eef3f0_45%,#e8eef2_100%)]" />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%231a3d3a' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
          }}
        />
      </div>

      <header className="border-b border-[var(--line)] bg-[var(--surface)]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div>
            <p className="font-display text-2xl tracking-tight text-[var(--ink)]">Swi-Kan-Ban</p>
            <p className="text-sm text-[var(--muted)]">
              {DEMO_SPACE.name} · data via{" "}
              <span className="text-[var(--ink)]">
                {backend === "sharepoint" ? "SharePoint" : "local demo"}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <nav
              className="flex rounded-lg border border-[var(--line)] bg-[var(--panel)] p-1"
              aria-label="Space views"
            >
              {VIEWS.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setView(v.id)}
                  aria-pressed={view === v.id}
                  className={`rounded-md px-3 py-1.5 text-sm transition ${
                    view === v.id
                      ? "bg-[var(--accent)] text-white"
                      : "text-[var(--muted)] hover:text-[var(--ink)]"
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </nav>

            {sharePointReady ? (
              signedIn ? (
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm hover:bg-[var(--wash)]"
                  title={accountName ?? undefined}
                >
                  Sign out
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void signIn()}
                  className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm text-white hover:brightness-110"
                >
                  Sign in with Microsoft
                </button>
              )
            ) : (
              <span className="rounded-lg border border-dashed border-[var(--line)] px-3 py-2 text-xs text-[var(--muted)]">
                Configure SharePoint in .env.local
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-5 py-6">
        <form
          onSubmit={(e) => void addCard(e)}
          className="mb-5 flex flex-wrap items-center gap-2"
        >
          <input
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            placeholder="New card title…"
            className="min-w-[220px] flex-1 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm outline-none ring-[var(--accent)] focus:ring-2"
          />
          <button
            type="submit"
            className="rounded-lg bg-[var(--ink)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90"
          >
            Add card
          </button>
          <button
            type="button"
            onClick={() => void refresh()}
            className="rounded-lg border border-[var(--line)] px-3 py-2.5 text-sm hover:bg-[var(--wash)]"
          >
            Refresh
          </button>
        </form>

        {error ? (
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <span className="flex-1">{error}</span>
            {backend === "sharepoint" ? (
              <button
                type="button"
                className="underline"
                onClick={() => switchToLocal()}
              >
                Use local demo
              </button>
            ) : null}
          </div>
        ) : null}

        {loading ? (
          <p className="text-sm text-[var(--muted)]">Loading cards…</p>
        ) : view === "kanban" ? (
          <KanbanView onOpenCard={setOpenCard} />
        ) : view === "calendar" ? (
          <CalendarView onOpenCard={setOpenCard} />
        ) : (
          <GanttView onOpenCard={setOpenCard} />
        )}
      </main>

      <CardDrawer card={openCard} onClose={() => setOpenCard(null)} />
    </div>
  );
}
