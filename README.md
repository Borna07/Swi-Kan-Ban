# Swi-Kan-Ban

Team work board inspired by [KanBo](https://kanboapp.com/de/) — **Kanban**, **Calendar**, and **Gantt** — with **SharePoint** as the data/document system.

## What you get

- **Kanban** — drag cards across To do / Doing / Done / Blocked
- **Calendar** — cards by due date (month grid)
- **Gantt** — start→due bars on a shared timeline
- **SharePoint** — cards stored in a SharePoint list via Microsoft Graph; documents stay in a document library (links on cards)
- **Local demo mode** — works out of the box without Azure (browser `localStorage`)

## Quick start (demo)

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Connect SharePoint

1. **Azure AD app registration** (SPA)
   - Redirect URI: `http://localhost:3000` (and your prod URL)
   - Delegated permissions: `User.Read`, `Sites.ReadWrite.All`, `Files.ReadWrite.All`
   - Grant admin consent

2. **SharePoint list** named e.g. `SwiCards` with columns:

   | Column         | Type           | Notes                        |
   |----------------|----------------|------------------------------|
   | Title          | Single line    | built-in                     |
   | Description    | Multiple lines |                              |
   | Status         | Choice         | `todo`, `doing`, `done`, `blocked` |
   | StartDate      | Date           |                              |
   | DueDate        | Date           |                              |
   | Assignee       | Single line    |                              |
   | Labels         | Single line    | comma-separated              |
   | ChecklistJson  | Multiple lines | JSON                         |
   | DocumentLinks  | Multiple lines | one URL per line             |

3. **Document library folder** e.g. `Shared Documents/SwiKanban` for files. Paste file URLs onto cards.

4. Copy `.env.example` → `.env.local` and fill:

```env
NEXT_PUBLIC_AZURE_CLIENT_ID=
NEXT_PUBLIC_AZURE_TENANT_ID=
NEXT_PUBLIC_SHAREPOINT_SITE_ID=
NEXT_PUBLIC_SHAREPOINT_LIST_ID=
NEXT_PUBLIC_SHAREPOINT_DOCS_PATH=/Shared Documents/SwiKanban
NEXT_PUBLIC_REDIRECT_URI=http://localhost:3000
```

Site ID / list ID: Graph Explorer → `GET https://graph.microsoft.com/v1.0/sites/{hostname}:/sites/{site-path}` then list under `/lists`.

5. Restart `npm run dev`, click **Sign in with Microsoft**.

## Scope (intentionally slim)

Included: Kanban, Calendar, Gantt, card details, checklist, SharePoint list + doc links.

Not included (KanBo has these): Mind Map, MySpace mirrors, Teams channel sync, on-prem/hybrid install, budget, full portfolio hierarchy.

## Stack

Next.js 15 · React 19 · Tailwind 4 · MSAL · Microsoft Graph · dnd-kit · date-fns
