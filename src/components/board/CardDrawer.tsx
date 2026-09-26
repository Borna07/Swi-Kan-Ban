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
    if (!card) {
      setDraft(null);
      return;
    }
    setDraft({
      ...card,
      checklist: (card.checklist ?? []).map(normalizeChecklistItem),
    });
    setSubTitle("");
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
              list="people-suggestions"
              className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-sm"
              value={draft.assignee ?? ""}
              onChange={(e) => setDraft({ ...draft, assignee: e.target.value || null })}
              onBlur={() => save({ assignee: draft.assignee })}
              placeholder="Name"
            />
          </label>

          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="text-xs uppercase tracking-wide text-[var(--muted)]">Note</span>
              <button
                type="button"
                disabled={bulletCount === 0}
                onClick={() => void convertBulletsToTodos()}
                className="text-xs text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40"
                title="Lines starting with - * • or 1. become to-dos"
              >
                Bullets → to-dos{bulletCount > 0 ? ` (${bulletCount})` : ""}
              </button>
            </div>
            <textarea
              className="min-h-[100px] w-full rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-sm"
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              onBlur={() => save({ description: draft.description })}
              placeholder={"Notes…\n- bullet becomes a to-do\n- another bullet"}
            />
          </div>

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
              <span className="text-xs uppercase tracking-wide text-[var(--muted)]">To-dos</span>
              <button
                type="button"
                className="text-xs text-[var(--accent)]"
                onClick={() => {
                  void saveChecklist([
                    ...draft.checklist,
                    newChecklistItem("New to-do", draft.assignee),
                  ]);
                }}
              >
                + Add
              </button>
            </div>
            {draft.checklist.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">
                Assign people to to-dos, or convert note bullets. Turn a to-do into a subcard when
                it needs its own dates and nesting.
              </p>
            ) : (
              <ul className="space-y-2">
                {draft.checklist.map((item, idx) => (
                  <li
                    key={item.id}
                    className="rounded-lg border border-[var(--line)] bg-[var(--panel)] px-2.5 py-2"
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
                        placeholder="Assign to…"
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
                        className="rounded border border-[var(--line)] px-2 py-1 text-xs text-[var(--accent)] hover:bg-[var(--wash)]"
                        onClick={() => void promoteTodoToSubcard(item)}
                        title="Create a nested subcard from this to-do"
                      >
                        → Subcard
                      </button>
                      <button
                        type="button"
                        className="rounded px-2 py-1 text-xs text-red-700 hover:underline"
                        onClick={() => {
                          void saveChecklist(draft.checklist.filter((c) => c.id !== item.id));
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-[var(--muted)]">
                Subcards
              </span>
              <span className="text-[11px] text-[var(--muted)]">unlimited nesting</span>
            </div>
            {subcards.length === 0 ? (
              <p className="mb-2 text-sm text-[var(--muted)]">
                No subcards yet. Promote a to-do, or add one below.
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

      <datalist id="people-suggestions">
        {people.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
    </div>
  );
}
