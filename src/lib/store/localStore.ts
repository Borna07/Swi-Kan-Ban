import { DEMO_CARDS, emptyCard } from "../demoData";
import { collectDescendantIds } from "../cardTree";
import type { Card, CardStore } from "../types";

/** Bump when demo shape changes so localStorage picks up new seed data. */
const STORAGE_KEY = "swikanban.cards.v2";

function normalize(card: Card): Card {
  return {
    ...card,
    parentId: card.parentId ?? null,
  };
}

function read(): Card[] {
  if (typeof window === "undefined") return DEMO_CARDS.map(normalize);
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEMO_CARDS));
      return structuredClone(DEMO_CARDS).map(normalize);
    }
    return (JSON.parse(raw) as Card[]).map(normalize);
  } catch {
    return structuredClone(DEMO_CARDS).map(normalize);
  }
}

function write(cards: Card[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

export function createLocalStore(): CardStore {
  return {
    backend: "local",
    async listCards() {
      return read();
    },
    async getCard(id) {
      return read().find((c) => c.id === id) ?? null;
    },
    async createCard(input) {
      const card = normalize({
        ...emptyCard(input.title, input.status ?? "todo"),
        ...input,
        parentId: input.parentId ?? null,
      });
      card.updatedAt = new Date().toISOString();
      card.createdAt = card.createdAt ?? card.updatedAt;
      const cards = read();
      cards.push(card);
      write(cards);
      return card;
    },
    async updateCard(id, patch) {
      const cards = read();
      const idx = cards.findIndex((c) => c.id === id);
      if (idx < 0) throw new Error(`Card ${id} not found`);
      cards[idx] = normalize({
        ...cards[idx],
        ...patch,
        id,
        updatedAt: new Date().toISOString(),
      });
      write(cards);
      return cards[idx];
    },
    async deleteCard(id) {
      const cards = read();
      const doomed = new Set([id, ...collectDescendantIds(cards, id)]);
      write(cards.filter((c) => !doomed.has(c.id)));
    },
  };
}
