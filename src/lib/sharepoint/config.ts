/**
 * SharePoint / Microsoft Graph configuration.
 *
 * Setup:
 * 1. Azure Portal → App registrations → New registration (SPA redirect: http://localhost:3000)
 * 2. API permissions (delegated): Sites.ReadWrite.All, User.Read, Files.ReadWrite.All
 * 3. Create a SharePoint site list named "SwiCards" with columns documented in listSchema.ts
 * 4. Copy site ID + list ID into .env.local (see .env.example)
 *
 * Until configured, the app runs in local demo mode.
 */

export interface SharePointConfig {
  clientId: string;
  tenantId: string;
  redirectUri: string;
  siteId: string;
  listId: string;
  documentLibraryPath: string;
}

export function getSharePointConfig(): SharePointConfig | null {
  const clientId = process.env.NEXT_PUBLIC_AZURE_CLIENT_ID ?? "";
  const tenantId = process.env.NEXT_PUBLIC_AZURE_TENANT_ID ?? "";
  const siteId = process.env.NEXT_PUBLIC_SHAREPOINT_SITE_ID ?? "";
  const listId = process.env.NEXT_PUBLIC_SHAREPOINT_LIST_ID ?? "";
  const redirectUri =
    process.env.NEXT_PUBLIC_REDIRECT_URI ??
    (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");
  const documentLibraryPath =
    process.env.NEXT_PUBLIC_SHAREPOINT_DOCS_PATH ?? "/Shared Documents/SwiKanban";

  if (!clientId || !tenantId || !siteId || !listId) return null;

  return {
    clientId,
    tenantId,
    redirectUri,
    siteId,
    listId,
    documentLibraryPath,
  };
}

export function isSharePointConfigured(): boolean {
  return getSharePointConfig() !== null;
}
