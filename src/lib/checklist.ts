import type { ChecklistItem } from "./types";

const BULLET_RE = /^\s*(?:[-*•]|\d+[.)])\s+(.+)$/;

export function newChecklistItem(
  text: string,
  assignee: string | null = null,
): ChecklistItem {
  return {
    id: `chk_${Math.random().toString(36).slice(2, 10)}`,
    text,
    done: false,
    assignee,
  };
}

/** Extract bullet / numbered lines from a note. Returns items + remaining text. */
export function extractBulletsFromNote(note: string): {
  items: string[];
  remaining: string;
} {
  const lines = note.split(/\r?\n/);
  const items: string[] = [];
  const kept: string[] = [];

  for (const line of lines) {
    const match = line.match(BULLET_RE);
    if (match?.[1]?.trim()) {
      items.push(match[1].trim());
    } else {
      kept.push(line);
    }
  }

  // Trim excess blank lines left behind
  const remaining = kept
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { items, remaining };
}

export function normalizeChecklistItem(item: ChecklistItem): ChecklistItem {
  return {
    id: item.id,
    text: item.text ?? "",
    done: Boolean(item.done),
    assignee: item.assignee ?? null,
  };
}
