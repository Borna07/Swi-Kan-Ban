"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getMsal, getActiveAccount, loginSharePoint, logoutSharePoint } from "../sharepoint/auth";
import { isSharePointConfigured } from "../sharepoint/config";
import type { Card, CardStore, DataBackend, SpaceView } from "../types";
import { collectDescendantIds } from "../cardTree";
import { createLocalStore } from "./localStore";
import { createSharePointStore } from "./sharepointStore";

interface BoardContextValue {
  cards: Card[];
  loading: boolean;
  error: string | null;
  view: SpaceView;
  setView: (v: SpaceView) => void;
  backend: DataBackend;
  sharePointReady: boolean;
  signedIn: boolean;
  accountName: string | null;
  refresh: () => Promise<void>;
  createCard: (
    title: string,
    parentId?: string | null,
    extras?: Partial<Card>,
  ) => Promise<Card>;
  updateCard: (id: string, patch: Partial<Card>) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
  moveCard: (id: string, status: Card["status"]) => Promise<void>;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  switchToLocal: () => void;
}

const BoardContext = createContext<BoardContextValue | null>(null);

export function BoardProvider({ children }: { children: ReactNode }) {
  const sharePointReady = isSharePointConfigured();
  const [backend, setBackend] = useState<DataBackend>(
    sharePointReady ? "sharepoint" : "local",
  );
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<SpaceView>("kanban");
  const [signedIn, setSignedIn] = useState(false);
  const [accountName, setAccountName] = useState<string | null>(null);

  const store: CardStore = useMemo(
    () => (backend === "sharepoint" ? createSharePointStore() : createLocalStore()),
    [backend],
  );

  const refreshAuth = useCallback(async () => {
    if (!sharePointReady) {
      setSignedIn(false);
      setAccountName(null);
      return;
    }
    const msal = await getMsal();
    if (!msal) return;
    const account = getActiveAccount(msal);
    setSignedIn(Boolean(account));
    setAccountName(account?.name ?? account?.username ?? null);
  }, [sharePointReady]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (backend === "sharepoint") {
        await refreshAuth();
        const msal = await getMsal();
        const account = msal ? getActiveAccount(msal) : null;
        if (!account) {
          setCards([]);
          setError("Sign in with Microsoft to load SharePoint cards.");
          return;
        }
      }
      const list = await store.listCards();
      setCards(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load cards");
    } finally {
      setLoading(false);
    }
  }, [backend, store, refreshAuth]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createCard = useCallback(
    async (title: string, parentId: string | null = null, extras: Partial<Card> = {}) => {
      const parent = parentId ? (await store.getCard(parentId)) : null;
      const card = await store.createCard({
        status: parent?.status ?? "todo",
        startDate: parent?.startDate ?? undefined,
        dueDate: parent?.dueDate ?? undefined,
        ...extras,
        title,
        parentId,
      });
      setCards((prev) => [...prev, card]);
      return card;
    },
    [store],
  );

  const updateCard = useCallback(
    async (id: string, patch: Partial<Card>) => {
      const updated = await store.updateCard(id, patch);
      setCards((prev) => prev.map((c) => (c.id === id ? updated : c)));
    },
    [store],
  );

  const deleteCard = useCallback(
    async (id: string) => {
      const doomed = new Set([id, ...collectDescendantIds(cards, id)]);
      await store.deleteCard(id);
      setCards((prev) => prev.filter((c) => !doomed.has(c.id)));
    },
    [store, cards],
  );

  const moveCard = useCallback(
    async (id: string, status: Card["status"]) => {
      setCards((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, status, updatedAt: new Date().toISOString() } : c,
        ),
      );
      try {
        await store.updateCard(id, { status });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Move failed");
        await refresh();
      }
    },
    [store, refresh],
  );

  const signIn = useCallback(async () => {
    await loginSharePoint();
    setBackend("sharepoint");
    await refreshAuth();
    await refresh();
  }, [refresh, refreshAuth]);

  const signOut = useCallback(async () => {
    await logoutSharePoint();
    setSignedIn(false);
    setAccountName(null);
    setBackend("local");
  }, []);

  const switchToLocal = useCallback(() => {
    setBackend("local");
    setError(null);
  }, []);

  const value: BoardContextValue = {
    cards,
    loading,
    error,
    view,
    setView,
    backend,
    sharePointReady,
    signedIn,
    accountName,
    refresh,
    createCard,
    updateCard,
    deleteCard,
    moveCard,
    signIn,
    signOut,
    switchToLocal,
  };

  return <BoardContext.Provider value={value}>{children}</BoardContext.Provider>;
}

export function useBoard() {
  const ctx = useContext(BoardContext);
  if (!ctx) throw new Error("useBoard must be used within BoardProvider");
  return ctx;
}
