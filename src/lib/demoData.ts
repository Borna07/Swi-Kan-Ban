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

export const DEMO_SPACE = {
  id: "space_team",
  name: "Team delivery",
  description: "Shared workstream — SharePoint is the document store",
};

export const DEMO_CARDS: Card[] = [
  {
    id: "card_brief",
    title: "Kickoff brief & scope",
    description: "Align on MVP: Kanban, Calendar, Gantt with SharePoint docs.",
    status: "done",
    startDate: daysFromNow(-10),
    dueDate: daysFromNow(-7),
    assignee: "Borna",
    labels: ["planning"],
    checklist: check(["Write goals", true], ["Confirm views", true]),
    documentLinks: [],
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: "card_sharepoint",
    title: "SharePoint list + library setup",
    description:
      "Create the Cards list and Documents library. Wire Graph auth for the team tenant.",
    status: "doing",
    startDate: daysFromNow(-3),
    dueDate: daysFromNow(2),
    assignee: "Borna",
    labels: ["infra", "sharepoint"],
    checklist: check(
      ["App registration", true],
      ["Cards list columns", false],
      ["Document library", false],
    ),
    documentLinks: [],
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: "card_kanban",
    title: "Kanban board UX",
    description: "Drag cards across status columns; open detail drawer.",
    status: "doing",
    startDate: daysFromNow(-2),
    dueDate: daysFromNow(3),
    assignee: "Alex",
    labels: ["ui"],
    checklist: check(["Columns", true], ["Drag & drop", false]),
    documentLinks: [],
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: "card_calendar",
    title: "Calendar view",
    description: "Month grid of cards by due date; click day to inspect.",
    status: "todo",
    startDate: daysFromNow(0),
    dueDate: daysFromNow(5),
    assignee: "Sam",
    labels: ["ui"],
    checklist: check(["Month layout", false], ["Due-date mapping", false]),
    documentLinks: [],
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: "card_gantt",
    title: "Gantt schedule",
    description: "Bars from start→due; resize timeline for planning.",
    status: "todo",
    startDate: daysFromNow(1),
    dueDate: daysFromNow(8),
    assignee: "Sam",
    labels: ["ui", "planning"],
    checklist: check(["Bars", false], ["Today marker", false]),
    documentLinks: [],
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: "card_docs",
    title: "Attach specs from SharePoint",
    description: "Link card documents to the space document library.",
    status: "blocked",
    startDate: daysFromNow(2),
    dueDate: daysFromNow(10),
    assignee: "Alex",
    labels: ["sharepoint"],
    checklist: check(["Pick library", false]),
    documentLinks: [],
    createdAt: now(),
    updatedAt: now(),
  },
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
    documentLinks: [],
    createdAt: stamp,
    updatedAt: stamp,
  };
}
