export type CardStatus = "todo" | "doing" | "done" | "blocked";

export type SpaceView = "kanban" | "calendar" | "gantt";

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
  /** Person responsible for this to-do item */
  assignee: string | null;
}

export interface Card {
  id: string;
  title: string;
  description: string;
  status: CardStatus;
  startDate: string | null;
  dueDate: string | null;
  assignee: string | null;
  labels: string[];
  checklist: ChecklistItem[];
  /** Parent card id for nested subcards (null = root). Unlimited depth. */
  parentId: string | null;
  sharePointItemId?: string;
  documentLinks: string[];
  updatedAt: string;
  createdAt: string;
}

export interface Space {
  id: string;
  name: string;
  description?: string;
}

export type DataBackend = "local" | "sharepoint";

export interface CardStore {
  listCards(): Promise<Card[]>;
  getCard(id: string): Promise<Card | null>;
  createCard(input: Partial<Card> & { title: string }): Promise<Card>;
  updateCard(id: string, patch: Partial<Card>): Promise<Card>;
  deleteCard(id: string): Promise<void>;
  backend: DataBackend;
}

/** Lane order matches KanBo board in the reference video. */
export const STATUS_ORDER: CardStatus[] = ["blocked", "todo", "doing", "done"];

export const STATUS_LABELS: Record<CardStatus, string> = {
  blocked: "Entwicklung",
  todo: "To Do",
  doing: "In Bearbeitung",
  done: "erledigt",
};

/** Colored lane headers (KanBo-style). */
export const STATUS_COLORS: Record<
  CardStatus,
  { header: string; text: string; soft: string }
> = {
  blocked: { header: "#3b3b3b", text: "#ffffff", soft: "#ececec" },
  todo: { header: "#d13438", text: "#ffffff", soft: "#fde7e9" },
  doing: { header: "#ffb900", text: "#1b1b1b", soft: "#fff4ce" },
  done: { header: "#107c10", text: "#ffffff", soft: "#dff6dd" },
};
