import { DEMO_CARDS, emptyCard } from "../demoData";
import type { Card, CardStore } from "../types";

const STORAGE_KEY = "swikanban.cards.v1";

function read(): Card[] {
  if (typeof window === "undefined") return DEMO_CARDS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEMO_CARDS));
      return structuredClone(DEMO_CARDS);
    }
    return JSON.parse(raw) as Card[];
  } catch {
    return structuredClone(DEMO_CARDS);
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
      const card = { ...emptyCard(input.title, input.status ?? "todo"), ...input };
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
      cards[idx] = {
        ...cards[idx],
        ...patch,
        id,
        updatedAt: new Date().toISOString(),
      };
      write(cards);
      return cards[idx];
    },
    async deleteCard(id) {
      write(read().filter((c) => c.id !== id));
    },
  };
}
