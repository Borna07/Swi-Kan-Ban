import { emptyCard } from "../demoData";
import type { Card, CardStore } from "../types";
import { getGraphToken } from "../sharepoint/auth";
import { getSharePointConfig } from "../sharepoint/config";
import { cardToGraphFields, graphItemToCard } from "../sharepoint/listSchema";

async function graphFetch(path: string, init: RequestInit = {}) {
  const token = await getGraphToken();
  if (!token) throw new Error("Not signed in to Microsoft 365");

  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Graph ${res.status}: ${body}`);
  }

  if (res.status === 204) return null;
  return res.json();
}

export function createSharePointStore(): CardStore {
  return {
    backend: "sharepoint",
    async listCards() {
      const config = getSharePointConfig();
      if (!config) throw new Error("SharePoint is not configured");
      const data = await graphFetch(
        `/sites/${config.siteId}/lists/${config.listId}/items?$expand=fields&$top=200`,
      );
      const items = (data?.value ?? []) as Parameters<typeof graphItemToCard>[0][];
      return items.map(graphItemToCard);
    },
    async getCard(id) {
      const cards = await this.listCards();
      return cards.find((c) => c.id === id) ?? null;
    },
    async createCard(input) {
      const config = getSharePointConfig();
      if (!config) throw new Error("SharePoint is not configured");
      const base = emptyCard(input.title, input.status ?? "todo");
      const card: Card = { ...base, ...input, title: input.title };
      const created = await graphFetch(
        `/sites/${config.siteId}/lists/${config.listId}/items`,
        {
          method: "POST",
          body: JSON.stringify({ fields: cardToGraphFields(card) }),
        },
      );
      return graphItemToCard(created);
    },
    async updateCard(id, patch) {
      const config = getSharePointConfig();
      if (!config) throw new Error("SharePoint is not configured");
      const existing = await this.getCard(id);
      if (!existing?.sharePointItemId) throw new Error("Card missing SharePoint id");
      const merged = { ...existing, ...patch, id };
      await graphFetch(
        `/sites/${config.siteId}/lists/${config.listId}/items/${existing.sharePointItemId}/fields`,
        {
          method: "PATCH",
          body: JSON.stringify(cardToGraphFields(merged)),
        },
      );
      return { ...merged, updatedAt: new Date().toISOString() };
    },
    async deleteCard(id) {
      const config = getSharePointConfig();
      if (!config) throw new Error("SharePoint is not configured");
      const existing = await this.getCard(id);
      if (!existing?.sharePointItemId) return;
      await graphFetch(
        `/sites/${config.siteId}/lists/${config.listId}/items/${existing.sharePointItemId}`,
        { method: "DELETE" },
      );
    },
  };
}

/** List files in the configured document library folder (for linking to cards). */
export async function listSharePointDocuments(): Promise<
  { name: string; webUrl: string; id: string }[]
> {
  const config = getSharePointConfig();
  if (!config) return [];
  const path = config.documentLibraryPath.replace(/^\/+/, "");
  try {
    const data = await graphFetch(
      `/sites/${config.siteId}/drive/root:/${encodeURI(path)}:/children`,
    );
    return (data?.value ?? [])
      .filter((f: { file?: unknown }) => f.file)
      .map((f: { id: string; name: string; webUrl: string }) => ({
        id: f.id,
        name: f.name,
        webUrl: f.webUrl,
      }));
  } catch {
    return [];
  }
}
