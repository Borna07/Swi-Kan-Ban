"use client";

import { useEffect, useMemo, useState } from "react";
import { getAncestors, getChildren, childProgress } from "@/lib/cardTree";
import {
  extractBulletsFromNote,
  newChecklistItem,
  normalizeChecklistItem,
} from "@/lib/checklist";
import { useBoard } from "@/lib/store/BoardContext";
import type { Card, CardStatus, ChecklistItem } from "@/lib/types";
import { STATUS_COLORS, STATUS_LABELS, STATUS_ORDER } from "@/lib/types";

export function CardDrawer({
  card,
  onClose,
  onOpenCard,
}: {
  card: Card | null;
  onClose: () => void;
  onOpenCard: (c: Card) => void;
}) {
  const { cards, updateCard, deleteCard, createCard } = useBoard();
  const [draft, setDraft] = useState<Card | null>(card);
  const [subTitle, setSubTitle] = useState("");
  const [tab, setTab] = useState<"content" | "subcards">("content");

  useEffect(() => {
    if (!card) {
      setDraft(null);
      return;
    }
    setDraft({
      ...card,
      checklist: (card.checklist ?? []).map(normalizeChecklistItem),
    });
    setSubTitle("");
    setTab("content");
  }, [card]);

  const people = useMemo(() => {
    const names = new Set<string>();
    for (const c of cards) {
      if (c.assignee) names.add(c.assignee);
      for (const item of c.checklist ?? []) {
        if (item.assignee) names.add(item.assignee);
      }
    }
    return [...names].sort();
  }, [cards]);

  if (!card || !draft) return null;

  const live = cards.find((c) => c.id === card.id) ?? draft;
  const ancestors = getAncestors(cards, live.id);
  const subcards = getChildren(cards, live.id);
  const progress = childProgress(cards, live.id);
  const bulletCount = extractBulletsFromNote(draft.description).items.length;
  const statusColor = STATUS_COLORS[live.status];

  async function save(patch: Partial<Card>) {
    const next = { ...draft!, ...patch };
    setDraft(next);
    await updateCard(card!.id, patch);
  }

  async function saveChecklist(checklist: ChecklistItem[]) {
    setDraft({ ...draft!, checklist });
    await updateCard(card!.id, { checklist });
  }

  async function addSubcard(e: React.FormEvent) {
    e.preventDefault();
    const title = subTitle.trim();
    if (!title) return;
    const created = await createCard(title, live.id);
    setSubTitle("");
    onOpenCard(created);
  }

  async function convertBulletsToTodos() {
    const current = draft;
    if (!current) return;
    const { items, remaining } = extractBulletsFromNote(current.description);
    if (items.length === 0) return;
    const checklist = [
      ...current.checklist,
      ...items.map((text) => newChecklistItem(text, current.assignee)),
    ];
    await save({ description: remaining, checklist });
  }

  async function promoteTodoToSubcard(item: ChecklistItem) {
    const current = draft;
    if (!current) return;
    const created = await createCard(item.text.trim() || "Untitled", live.id, {
      assignee: item.assignee,
      status: item.done ? "done" : "todo",
    });
    const checklist = current.checklist.filter((c) => c.id !== item.id);
    await saveChecklist(checklist);
    onOpenCard(created);
  }

  return (
    <div className="fixed inset-0 z-40 flex items-stretch justify-center bg-[rgba(0,0,0,0.45)] p-3 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Overlay schließen"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-[var(--radius)] bg-[var(--surface)] shadow-[var(--shadow-lift)]">
        <header className="flex items-start justify-between gap-3 border-b border-[var(--line)] px-5 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] text-[var(--muted)]">
              {live.parentId ? "Unterkarte" : "Kartendetails"}
              {progress.total > 0 ? ` · ${progress.done}/${progress.total} Unterkarten erledigt` : ""}
            </p>
            {ancestors.length > 0 ? (
              <nav className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-[var(--muted)]">
                {ancestors.map((a, i) => (
                  <span key={a.id} className="inline-flex items-center gap-1">
                    {i > 0 ? <span>/</span> : null}
                    <button
                      type="button"
                      className="text-[var(--accent)] hover:underline"
                      onClick={() => onOpenCard(a)}
                    >
                      {a.title}
                    </button>
                  </span>
                ))}
              </nav>
            ) : null}
            <input
              className="mt-1 w-full bg-transparent text-xl font-semibold text-[var(--ink)] outline-none"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              onBlur={() => save({ title: draft.title })}
            />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[var(--radius)] px-2 py-1 text-lg leading-none text-[var(--muted)] hover:bg-[var(--panel)]"
            aria-label="Karte schließen"
          >
            ×
          </button>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[220px_1fr_220px]">
          {/* Left metadata */}
          <aside className="space-y-4 overflow-y-auto border-b border-[var(--line)] p-4 lg:border-b-0 lg:border-r">
            <div className="flex gap-3 border-b border-[var(--line)] text-sm">
              <button
                type="button"
                onClick={() => setTab("content")}
                className={`border-b-2 pb-2 ${
                  tab === "content"
                    ? "border-[var(--accent)] font-semibold text-[var(--accent)]"
                    : "border-transparent text-[var(--muted)]"
                }`}
              >
                Inhalt
              </button>
              <button
                type="button"
                onClick={() => setTab("subcards")}
                className={`border-b-2 pb-2 ${
                  tab === "subcards"
                    ? "border-[var(--accent)] font-semibold text-[var(--accent)]"
                    : "border-transparent text-[var(--muted)]"
                }`}
              >
                Unterkarten
              </button>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                Status
              </p>
              <p className="mt-1 text-sm font-semibold" style={{ color: statusColor.header }}>
                {STATUS_LABELS[live.status]}
              </p>
              <div className="mt-2 flex items-center gap-1">
                {STATUS_ORDER.map((s) => {
                  const active = live.status === s;
                  const c = STATUS_COLORS[s];
                  return (
                    <button
                      key={s}
                      type="button"
                      title={STATUS_LABELS[s]}
                      onClick={() => void save({ status: s })}
                      className={`h-8 w-8 rounded-full border-2 transition ${
                        active ? "scale-110" : "opacity-50 hover:opacity-100"
                      }`}
                      style={{
                        background: c.header,
                        borderColor: active ? "var(--ink)" : "transparent",
                      }}
                      aria-label={STATUS_LABELS[s]}
                    />
                  );
                })}
              </div>
              <select
                className="mt-2 w-full rounded-[var(--radius)] border border-[var(--line)] bg-[var(--wash)] px-2 py-1.5 text-sm"
                value={draft.status}
                onChange={(e) => save({ status: e.target.value as CardStatus })}
              >
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                Termine
              </p>
              <div className="mt-2 grid gap-2">
                <label className="block text-xs text-[var(--muted)]">
                  Startdatum
                  <input
                    type="date"
                    className="mt-1 w-full rounded-[var(--radius)] border border-[var(--line)] bg-[var(--wash)] px-2 py-1.5 text-sm text-[var(--ink)]"
                    value={draft.startDate ?? ""}
                    onChange={(e) => save({ startDate: e.target.value || null })}
                  />
                </label>
                <label className="block text-xs text-[var(--muted)]">
                  Fälligkeitsdatum
                  <input
                    type="date"
                    className="mt-1 w-full rounded-[var(--radius)] border border-[var(--line)] bg-[var(--wash)] px-2 py-1.5 text-sm text-[var(--ink)]"
                    value={draft.dueDate ?? ""}
                    onChange={(e) => save({ dueDate: e.target.value || null })}
                  />
                </label>
              </div>
            </div>

            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                Kartenmitglieder
              </span>
              <input
                list="people-suggestions"
                className="mt-1 w-full rounded-[var(--radius)] border border-[var(--line)] bg-[var(--wash)] px-2 py-1.5 text-sm"
                value={draft.assignee ?? ""}
                onChange={(e) => setDraft({ ...draft, assignee: e.target.value || null })}
                onBlur={() => save({ assignee: draft.assignee })}
                placeholder="Name"
              />
            </label>

            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                Kategorien
              </span>
              <input
                className="mt-1 w-full rounded-[var(--radius)] border border-[var(--line)] bg-[var(--wash)] px-2 py-1.5 text-sm"
                value={draft.labels.join(", ")}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    labels: e.target.value
                      .split(",")
                      .map((x) => x.trim())
                      .filter(Boolean),
                  })
                }
                onBlur={() => save({ labels: draft.labels })}
              />
            </label>
          </aside>

          {/* Center content */}
          <section className="min-h-0 overflow-y-auto p-4">
            {tab === "content" ? (
              <div className="space-y-5">
                <div>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                      Notiz
                    </span>
                    <button
                      type="button"
                      disabled={bulletCount === 0}
                      onClick={() => void convertBulletsToTodos()}
                      className="text-xs text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Aufzählung → Aufgaben{bulletCount > 0 ? ` (${bulletCount})` : ""}
                    </button>
                  </div>
                  <textarea
                    className="min-h-[120px] w-full rounded-[var(--radius)] border border-[var(--line)] bg-[var(--wash)] px-3 py-2 text-sm"
                    value={draft.description}
                    onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                    onBlur={() => save({ description: draft.description })}
                    placeholder={"Notiz…\n- Aufzählung wird zur Aufgabe"}
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                      Aufgabenliste
                    </span>
                    <button
                      type="button"
                      className="text-xs text-[var(--accent)]"
                      onClick={() => {
                        void saveChecklist([
                          ...draft.checklist,
                          newChecklistItem("Neue Aufgabe", draft.assignee),
                        ]);
                      }}
                    >
                      + Hinzufügen
                    </button>
                  </div>
                  {draft.checklist.length === 0 ? (
                    <p className="rounded-[var(--radius)] border border-dashed border-[var(--line-strong)] px-3 py-6 text-center text-sm text-[var(--muted)]">
                      Noch keine Aufgaben. Füge Elemente hinzu oder wandle Notiz-Aufzählungen um.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {draft.checklist.map((item, idx) => (
                        <li
                          key={item.id}
                          className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--wash)] px-2.5 py-2"
                        >
                          <div className="flex items-start gap-2">
                            <input
                              type="checkbox"
                              className="mt-1"
                              checked={item.done}
                              onChange={() => {
                                const checklist = draft.checklist.map((c, i) =>
                                  i === idx ? { ...c, done: !c.done } : c,
                                );
                                void saveChecklist(checklist);
                              }}
                            />
                            <input
                              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                              value={item.text}
                              onChange={(e) => {
                                const checklist = draft.checklist.map((c, i) =>
                                  i === idx ? { ...c, text: e.target.value } : c,
                                );
                                setDraft({ ...draft, checklist });
                              }}
                              onBlur={() => saveChecklist(draft.checklist)}
                            />
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2 pl-6">
                            <input
                              list="people-suggestions"
                              className="min-w-[120px] flex-1 rounded border border-[var(--line)] bg-[var(--surface)] px-2 py-1 text-xs"
                              placeholder="Zuweisen…"
                              value={item.assignee ?? ""}
                              onChange={(e) => {
                                const checklist = draft.checklist.map((c, i) =>
                                  i === idx ? { ...c, assignee: e.target.value || null } : c,
                                );
                                setDraft({ ...draft, checklist });
                              }}
                              onBlur={() => saveChecklist(draft.checklist)}
                            />
                            <button
                              type="button"
                              className="rounded border border-[var(--line)] px-2 py-1 text-xs text-[var(--accent)] hover:bg-[var(--panel)]"
                              onClick={() => void promoteTodoToSubcard(item)}
                            >
                              → Unterkarte
                            </button>
                            <button
                              type="button"
                              className="rounded px-2 py-1 text-xs text-red-700 hover:underline"
                              onClick={() => {
                                void saveChecklist(draft.checklist.filter((c) => c.id !== item.id));
                              }}
                            >
                              Entfernen
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                    SharePoint-Dokumente
                  </span>
                  {draft.documentLinks.length === 0 ? (
                    <p className="mt-2 text-sm text-[var(--muted)]">
                      SharePoint-URLs einfügen. Dateien bleiben in der Bibliothek; Karten speichern
                      nur Links.
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-1">
                      {draft.documentLinks.map((url) => (
                        <li key={url}>
                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="break-all text-sm text-[var(--accent)] underline"
                          >
                            {url}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                  <textarea
                    className="mt-2 min-h-[72px] w-full rounded-[var(--radius)] border border-[var(--line)] bg-[var(--wash)] px-3 py-2 text-sm"
                    placeholder="Eine SharePoint-URL pro Zeile"
                    value={draft.documentLinks.join("\n")}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        documentLinks: e.target.value
                          .split("\n")
                          .map((x) => x.trim())
                          .filter(Boolean),
                      })
                    }
                    onBlur={() => save({ documentLinks: draft.documentLinks })}
                  />
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                    Unterkarten
                  </span>
                  <span className="text-[11px] text-[var(--muted)]">beliebige Verschachtelung</span>
                </div>
                {subcards.length === 0 ? (
                  <p className="mb-2 text-sm text-[var(--muted)]">Noch keine Unterkarten.</p>
                ) : (
                  <ul className="mb-3 space-y-1.5">
                    {subcards.map((child) => {
                      const grand = getChildren(cards, child.id).length;
                      return (
                        <li key={child.id}>
                          <button
                            type="button"
                            onClick={() => onOpenCard(child)}
                            className="flex w-full items-center justify-between rounded-[var(--radius)] border border-[var(--line)] bg-[var(--wash)] px-3 py-2 text-left text-sm hover:border-[var(--accent)]"
                          >
                            <span className="truncate font-medium text-[var(--ink)]">
                              {child.title}
                            </span>
                            <span className="ml-2 shrink-0 text-[11px] text-[var(--muted)]">
                              {STATUS_LABELS[child.status]}
                              {child.assignee ? ` · ${child.assignee}` : ""}
                              {grand > 0 ? ` · ${grand} nested` : ""}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <form onSubmit={(e) => void addSubcard(e)} className="flex gap-2">
                  <input
                    value={subTitle}
                    onChange={(e) => setSubTitle(e.target.value)}
                    placeholder="Neue Unterkarte…"
                    className="min-w-0 flex-1 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--wash)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                  />
                  <button
                    type="submit"
                    className="rounded-[var(--radius)] bg-[var(--accent)] px-3 py-2 text-sm text-white hover:bg-[var(--accent-hover)]"
                  >
                    Hinzufügen
                  </button>
                </form>
              </div>
            )}
          </section>

          {/* Right comments column */}
          <aside className="hidden overflow-y-auto border-l border-[var(--line)] p-4 lg:block">
            <div className="flex gap-3 border-b border-[var(--line)] text-sm">
              <span className="border-b-2 border-[var(--accent)] pb-2 font-semibold text-[var(--accent)]">
                Kommentare
              </span>
              <span className="border-b-2 border-transparent pb-2 text-[var(--muted)]">
                Aktivität
              </span>
            </div>
            <p className="mt-6 text-center text-sm text-[var(--muted)]">
              Es gibt noch keine Kommentare.
            </p>
          </aside>
        </div>

        <footer className="border-t border-[var(--line)] px-5 py-3">
          <button
            type="button"
            className="text-sm text-red-700 hover:underline"
            onClick={async () => {
              await deleteCard(card.id);
              onClose();
            }}
          >
            Karte löschen{subcards.length > 0 ? " + alle Unterkarten" : ""}
          </button>
        </footer>
      </div>

      <datalist id="people-suggestions">
        {people.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
    </div>
  );
}
