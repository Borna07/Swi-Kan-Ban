import type { Card, CardStatus, ChecklistItem } from "./types";

function id(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

const now = () => new Date().toISOString();

function daysFromNow(n: number): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function check(...items: [string, boolean][]): ChecklistItem[] {
  return items.map(([text, done]) => ({ id: id("chk"), text, done }));
}

function card(
  partial: Omit<Card, "createdAt" | "updatedAt" | "documentLinks" | "checklist" | "labels" | "description" | "parentId"> &
    Partial<Pick<Card, "documentLinks" | "checklist" | "labels" | "description" | "parentId">>,
): Card {
  const stamp = now();
  return {
    description: "",
    labels: [],
    checklist: [],
    documentLinks: [],
    parentId: null,
    ...partial,
    createdAt: stamp,
    updatedAt: stamp,
  };
}

export const DEMO_SPACE = {
  id: "space_team",
  name: "Team delivery",
  description: "Shared workstream — SharePoint is the document store",
};

export const DEMO_CARDS: Card[] = [
  card({
    id: "card_brief",
    title: "Kickoff brief & scope",
    description: "Align on MVP: Kanban, Calendar, Gantt with SharePoint docs.",
    status: "done",
    startDate: daysFromNow(-10),
    dueDate: daysFromNow(-7),
    assignee: "Borna",
    labels: ["planning"],
    checklist: check(["Write goals", true], ["Confirm views", true]),
  }),
  card({
    id: "card_sharepoint",
    title: "SharePoint list + library setup",
    description:
      "Create the Cards list and Documents library. Wire Graph auth for the team tenant.",
    status: "doing",
    startDate: daysFromNow(-3),
    dueDate: daysFromNow(2),
    assignee: "Borna",
    labels: ["infra", "sharepoint"],
    checklist: check(["App registration", true]),
  }),
  card({
    id: "card_sp_list",
    title: "Create SwiCards list columns",
    description: "Title, Status, dates, ParentId, ChecklistJson…",
    status: "doing",
    startDate: daysFromNow(-2),
    dueDate: daysFromNow(1),
    assignee: "Borna",
    labels: ["sharepoint"],
    parentId: "card_sharepoint",
  }),
  card({
    id: "card_sp_parent",
    title: "Add ParentId column",
    description: "Single line text storing parent card id for nesting.",
    status: "todo",
    startDate: daysFromNow(-1),
    dueDate: daysFromNow(1),
    assignee: "Borna",
    labels: ["sharepoint"],
    parentId: "card_sp_list",
  }),
  card({
    id: "card_sp_docs",
    title: "Document library folder",
    description: "Shared Documents/SwiKanban for attachments.",
    status: "todo",
    startDate: daysFromNow(0),
    dueDate: daysFromNow(2),
    assignee: "Alex",
    labels: ["sharepoint"],
    parentId: "card_sharepoint",
  }),
  card({
    id: "card_kanban",
    title: "Kanban board UX",
    description: "Drag cards across status columns; open detail drawer.",
    status: "doing",
    startDate: daysFromNow(-2),
    dueDate: daysFromNow(3),
    assignee: "Alex",
    labels: ["ui"],
  }),
  card({
    id: "card_kanban_dnd",
    title: "Drag and drop columns",
    status: "doing",
    startDate: daysFromNow(-1),
    dueDate: daysFromNow(2),
    assignee: "Alex",
    labels: ["ui"],
    parentId: "card_kanban",
  }),
  card({
    id: "card_kanban_nest",
    title: "Expand nested subcards",
    status: "todo",
    startDate: daysFromNow(0),
    dueDate: daysFromNow(3),
    assignee: "Alex",
    labels: ["ui"],
    parentId: "card_kanban",
  }),
  card({
    id: "card_calendar",
    title: "Month calendar layout",
    description: "Month grid of cards by due date; click day to inspect.",
    status: "todo",
    startDate: daysFromNow(0),
    dueDate: daysFromNow(5),
    assignee: "Sam",
    labels: ["ui"],
  }),
  card({
    id: "card_gantt",
    title: "Gantt schedule bars",
    description: "Bars from start→due; hierarchy indented like KanBo.",
    status: "todo",
    startDate: daysFromNow(1),
    dueDate: daysFromNow(8),
    assignee: "Sam",
    labels: ["ui", "planning"],
  }),
  card({
    id: "card_gantt_tree",
    title: "Tree rows + indent",
    status: "todo",
    startDate: daysFromNow(2),
    dueDate: daysFromNow(6),
    assignee: "Sam",
    labels: ["ui"],
    parentId: "card_gantt",
  }),
  card({
    id: "card_gantt_expand",
    title: "Collapse / expand parents",
    status: "todo",
    startDate: daysFromNow(3),
    dueDate: daysFromNow(7),
    assignee: "Sam",
    labels: ["ui"],
    parentId: "card_gantt",
  }),
  card({
    id: "card_docs",
    title: "Attach specs from SharePoint",
    description: "Link card documents to the space document library.",
    status: "blocked",
    startDate: daysFromNow(2),
    dueDate: daysFromNow(10),
    assignee: "Alex",
    labels: ["sharepoint"],
  }),
];

export function emptyCard(title: string, status: CardStatus = "todo"): Card {
  const stamp = now();
  return {
    id: id("card"),
    title,
    description: "",
    status,
    startDate: daysFromNow(0),
    dueDate: daysFromNow(7),
    assignee: null,
    labels: [],
    checklist: [],
    parentId: null,
    documentLinks: [],
    createdAt: stamp,
    updatedAt: stamp,
  };
}
