/**
 * Expected SharePoint list columns for card storage.
 *
 * List name suggestion: SwiCards
 * Create these columns in SharePoint (List settings → Create column):
 *
 * | Internal name   | Type            | Notes                          |
 * |-----------------|-----------------|--------------------------------|
 * | Title           | Single line     | built-in                       |
 * | Description     | Multiple lines  | plain text                     |
 * | Status          | Choice          | todo, doing, done, blocked     |
 * | StartDate       | Date            | date only                      |
 * | DueDate         | Date            | date only                      |
 * | Assignee        | Single line     | or Person — we store display   |
 * | Labels          | Single line     | comma-separated                |
 * | ChecklistJson   | Multiple lines  | JSON array                     |
 * | DocumentLinks   | Multiple lines  | newline-separated URLs         |
 * | ParentId        | Single line     | parent card id (empty = root)  |
 */

import type { Card, CardStatus, ChecklistItem } from "../types";

export const SHAREPOINT_LIST_FIELDS = [
  "Title",
  "Description",
  "Status",
  "StartDate",
  "DueDate",
  "Assignee",
  "Labels",
  "ChecklistJson",
  "DocumentLinks",
  "ParentId",
] as const;

type GraphListItem = {
  id: string;
  fields?: Record<string, unknown>;
  lastModifiedDateTime?: string;
  createdDateTime?: string;
};

function asString(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function asDate(v: unknown): string | null {
  if (!v) return null;
  const s = asString(v);
  return s.slice(0, 10) || null;
}

function parseChecklist(raw: unknown): ChecklistItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(asString(raw));
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item, i) => ({
      id: asString(item.id) || `chk_${i}`,
      text: asString(item.text),
      done: Boolean(item.done),
      assignee: asString(item.assignee) || null,
    }));
  } catch {
    return [];
  }
}

function parseLinks(raw: unknown): string[] {
  const s = asString(raw).trim();
  if (!s) return [];
  return s
    .split(/[\n,]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

export function graphItemToCard(item: GraphListItem): Card {
  const f = item.fields ?? {};
  const statusRaw = asString(f.Status || f.status).toLowerCase();
  const status = (["todo", "doing", "done", "blocked"].includes(statusRaw)
    ? statusRaw
    : "todo") as CardStatus;

  const labels = asString(f.Labels)
    .split(",")
    .map((l) => l.trim())
    .filter(Boolean);

  const parentRaw = asString(f.ParentId).trim();

  return {
    id: `sp_${item.id}`,
    sharePointItemId: item.id,
    title: asString(f.Title) || "Untitled",
    description: asString(f.Description),
    status,
    startDate: asDate(f.StartDate),
    dueDate: asDate(f.DueDate),
    assignee: asString(f.Assignee) || null,
    labels,
    checklist: parseChecklist(f.ChecklistJson),
    parentId: parentRaw || null,
    documentLinks: parseLinks(f.DocumentLinks),
    createdAt: item.createdDateTime ?? new Date().toISOString(),
    updatedAt: item.lastModifiedDateTime ?? new Date().toISOString(),
  };
}

export function cardToGraphFields(card: Partial<Card> & { title?: string }) {
  return {
    Title: card.title ?? "",
    Description: card.description ?? "",
    Status: card.status ?? "todo",
    StartDate: card.startDate ?? null,
    DueDate: card.dueDate ?? null,
    Assignee: card.assignee ?? "",
    Labels: (card.labels ?? []).join(", "),
    ChecklistJson: JSON.stringify(card.checklist ?? []),
    DocumentLinks: (card.documentLinks ?? []).join("\n"),
    ParentId: card.parentId ?? "",
  };
}
