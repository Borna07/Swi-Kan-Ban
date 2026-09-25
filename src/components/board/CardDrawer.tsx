"use client";

import { useEffect, useState } from "react";
import { getAncestors, getChildren, childProgress } from "@/lib/cardTree";
import { useBoard } from "@/lib/store/BoardContext";
import type { Card, CardStatus } from "@/lib/types";
import { STATUS_LABELS, STATUS_ORDER } from "@/lib/types";

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

  useEffect(() => {
    setDraft(card);
    setSubTitle("");
  }, [card]);

  if (!card || !draft) return null;

  const live = cards.find((c) => c.id === card.id) ?? draft;
  const ancestors = getAncestors(cards, live.id);
  const subcards = getChildren(cards, live.id);
  const progress = childProgress(cards, live.id);

  async function save(patch: Partial<Card>) {
    const next = { ...draft!, ...patch };
    setDraft(next);
    await updateCard(card!.id, patch);
  }

  async function addSubcard(e: React.FormEvent) {
    e.preventDefault();
    const title = subTitle.trim();
    if (!title) return;
    const created = await createCard(title, live.id);
    setSubTitle("");
    onOpenCard(created);
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-[rgba(12,24,32,0.35)] backdrop-blur-[2px]">
      <button
        type="button"
        className="flex-1 cursor-default"
        aria-label="Dismiss overlay"
        onClick={onClose}
      />
      <aside className="flex h-full w-full max-w-md flex-col border-l border-[var(--line)] bg-[var(--surface)] shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-[var(--line)] px-5 py-4">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">
              {live.parentId ? "Subcard" : "Card"}
              {progress.total > 0 ? ` · ${progress.done}/${progress.total} children done` : ""}
            </p>
            {ancestors.length > 0 ? (
              <nav className="mt-1 flex flex-wrap items-center gap-1 text-xs text-[var(--muted)]">
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
              className="mt-1 w-full bg-transparent font-display text-2xl text-[var(--ink)] outline-none"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              onBlur={() => save({ title: draft.title })}
            />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[var(--line)] px-2 py-1 text-sm text-[var(--muted)] hover:bg-[var(--wash)]"
          >
            Close
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <label className="block">
            <span className="text-xs uppercase tracking-wide text-[var(--muted)]">Status</span>
            <select
              className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-sm"
              value={draft.status}
              onChange={(e) => save({ status: e.target.value as CardStatus })}
            >
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs uppercase tracking-wide text-[var(--muted)]">Start</span>
              <input
                type="date"
                className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-sm"
                value={draft.startDate ?? ""}
                onChange={(e) => save({ startDate: e.target.value || null })}
              />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-wide text-[var(--muted)]">Due</span>
              <input
                type="date"
                className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-sm"
                value={draft.dueDate ?? ""}
                onChange={(e) => save({ dueDate: e.target.value || null })}
              />
            </label>
          </div>

          <label className="block">
            <span className="text-xs uppercase tracking-wide text-[var(--muted)]">Assignee</span>
            <input
              className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-sm"
              value={draft.assignee ?? ""}
              onChange={(e) => setDraft({ ...draft, assignee: e.target.value || null })}
              onBlur={() => save({ assignee: draft.assignee })}
              placeholder="Name"
            />
          </label>

          <label className="block">
            <span className="text-xs uppercase tracking-wide text-[var(--muted)]">Description</span>
            <textarea
              className="mt-1 min-h-[80px] w-full rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-sm"
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              onBlur={() => save({ description: draft.description })}
            />
          </label>

          <label className="block">
            <span className="text-xs uppercase tracking-wide text-[var(--muted)]">
              Labels (comma-separated)
            </span>
            <input
              className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-sm"
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

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-[var(--muted)]">
                Subcards
              </span>
              <span className="text-[11px] text-[var(--muted)]">unlimited nesting</span>
            </div>
            {subcards.length === 0 ? (
              <p className="mb-2 text-sm text-[var(--muted)]">
                No subcards yet. Add one below — then open it to nest further.
              </p>
            ) : (
              <ul className="mb-3 space-y-1.5">
                {subcards.map((child) => {
                  const grand = getChildren(cards, child.id).length;
                  return (
                    <li key={child.id}>
                      <button
                        type="button"
                        onClick={() => onOpenCard(child)}
                        className="flex w-full items-center justify-between rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-left text-sm hover:border-[var(--accent)]"
                      >
                        <span className="truncate font-medium text-[var(--ink)]">{child.title}</span>
                        <span className="ml-2 shrink-0 text-[11px] text-[var(--muted)]">
                          {STATUS_LABELS[child.status]}
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
                placeholder="New subcard title…"
                className="min-w-0 flex-1 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-sm outline-none ring-[var(--accent)] focus:ring-2"
              />
              <button
                type="submit"
                className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm text-white hover:brightness-110"
              >
                Add
              </button>
            </form>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-[var(--muted)]">Checklist</span>
              <button
                type="button"
                className="text-xs text-[var(--accent)]"
                onClick={() => {
                  const checklist = [
                    ...draft.checklist,
                    {
                      id: `chk_${Math.random().toString(36).slice(2, 8)}`,
                      text: "New step",
                      done: false,
                    },
                  ];
                  setDraft({ ...draft, checklist });
                  void save({ checklist });
                }}
              >
                + Add
              </button>
            </div>
            <ul className="space-y-2">
              {draft.checklist.map((item, idx) => (
                <li key={item.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={() => {
                      const checklist = draft.checklist.map((c, i) =>
                        i === idx ? { ...c, done: !c.done } : c,
                      );
                      setDraft({ ...draft, checklist });
                      void save({ checklist });
                    }}
                  />
                  <input
                    className="flex-1 border-b border-transparent bg-transparent text-sm outline-none focus:border-[var(--line)]"
                    value={item.text}
                    onChange={(e) => {
                      const checklist = draft.checklist.map((c, i) =>
                        i === idx ? { ...c, text: e.target.value } : c,
                      );
                      setDraft({ ...draft, checklist });
                    }}
                    onBlur={() => save({ checklist: draft.checklist })}
                  />
                </li>
              ))}
            </ul>
          </div>

          <div>
            <span className="text-xs uppercase tracking-wide text-[var(--muted)]">
              SharePoint documents
            </span>
            {draft.documentLinks.length === 0 ? (
              <p className="mt-2 text-sm text-[var(--muted)]">
                Paste SharePoint file URLs below. Files live in your document library; cards only
                store links.
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
              className="mt-2 min-h-[72px] w-full rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-sm"
              placeholder="One SharePoint URL per line"
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

        <footer className="border-t border-[var(--line)] px-5 py-4">
          <button
            type="button"
            className="text-sm text-red-700 hover:underline"
            onClick={async () => {
              await deleteCard(card.id);
              onClose();
            }}
          >
            Delete card{subcards.length > 0 ? " + all nested subcards" : ""}
          </button>
        </footer>
      </aside>
    </div>
  );
}
