import type { Card } from "./types";

export function getChildren(cards: Card[], parentId: string): Card[] {
  return cards
    .filter((c) => c.parentId === parentId)
    .sort((a, b) => a.title.localeCompare(b.title));
}

export function getRoots(cards: Card[]): Card[] {
  const ids = new Set(cards.map((c) => c.id));
  return cards
    .filter((c) => !c.parentId || !ids.has(c.parentId))
    .sort((a, b) => a.title.localeCompare(b.title));
}

export function getDepth(cards: Card[], cardId: string): number {
  const byId = new Map(cards.map((c) => [c.id, c]));
  let depth = 0;
  let current = byId.get(cardId);
  const seen = new Set<string>();
  while (current?.parentId && !seen.has(current.id)) {
    seen.add(current.id);
    depth += 1;
    current = byId.get(current.parentId);
  }
  return depth;
}

export function getAncestors(cards: Card[], cardId: string): Card[] {
  const byId = new Map(cards.map((c) => [c.id, c]));
  const chain: Card[] = [];
  let current = byId.get(cardId);
  const seen = new Set<string>();
  while (current?.parentId && !seen.has(current.id)) {
    seen.add(current.id);
    const parent = byId.get(current.parentId);
    if (!parent) break;
    chain.unshift(parent);
    current = parent;
  }
  return chain;
}

/** Depth-first preorder of the full forest (or a subtree). */
export function flattenTree(
  cards: Card[],
  options?: { rootId?: string | null; expandedIds?: Set<string> },
): { card: Card; depth: number }[] {
  const result: { card: Card; depth: number }[] = [];
  const expanded = options?.expandedIds;

  function walk(parentId: string | null, depth: number) {
    const kids =
      parentId === null
        ? getRoots(cards)
        : getChildren(cards, parentId);
    for (const card of kids) {
      if (options?.rootId != null && parentId === null && card.id !== options.rootId) {
        continue;
      }
      result.push({ card, depth });
      if (!expanded || expanded.has(card.id)) {
        walk(card.id, depth + 1);
      }
    }
  }

  if (options?.rootId) {
    const root = cards.find((c) => c.id === options.rootId);
    if (!root) return result;
    result.push({ card: root, depth: 0 });
    if (!expanded || expanded.has(root.id)) walk(root.id, 1);
  } else {
    walk(null, 0);
  }

  return result;
}

export function collectDescendantIds(cards: Card[], rootId: string): string[] {
  const ids: string[] = [];
  function walk(id: string) {
    for (const child of getChildren(cards, id)) {
      ids.push(child.id);
      walk(child.id);
    }
  }
  walk(rootId);
  return ids;
}

export function childProgress(cards: Card[], parentId: string): { done: number; total: number } {
  const children = getChildren(cards, parentId);
  const total = children.length;
  const done = children.filter((c) => c.status === "done").length;
  return { done, total };
}

export function hasChildren(cards: Card[], cardId: string): boolean {
  return cards.some((c) => c.parentId === cardId);
}
