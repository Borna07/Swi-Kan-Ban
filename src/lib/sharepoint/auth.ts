"use client";

import {
  PublicClientApplication,
  type AccountInfo,
  type AuthenticationResult,
  InteractionRequiredAuthError,
} from "@azure/msal-browser";
import { getSharePointConfig } from "./config";

const GRAPH_SCOPES = [
  "User.Read",
  "Sites.ReadWrite.All",
  "Files.ReadWrite.All",
];

let pca: PublicClientApplication | null = null;
let initPromise: Promise<PublicClientApplication> | null = null;

export async function getMsal(): Promise<PublicClientApplication | null> {
  const config = getSharePointConfig();
  if (!config) return null;

  if (pca) return pca;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const instance = new PublicClientApplication({
      auth: {
        clientId: config.clientId,
        authority: `https://login.microsoftonline.com/${config.tenantId}`,
        redirectUri: config.redirectUri,
      },
      cache: {
        cacheLocation: "localStorage",
      },
    });
    await instance.initialize();
    await instance.handleRedirectPromise();
    pca = instance;
    return instance;
  })();

  return initPromise;
}

export function getActiveAccount(instance: PublicClientApplication): AccountInfo | null {
  const accounts = instance.getAllAccounts();
  return instance.getActiveAccount() ?? accounts[0] ?? null;
}

export async function loginSharePoint(): Promise<AuthenticationResult | null> {
  const instance = await getMsal();
  if (!instance) return null;
  const result = await instance.loginPopup({ scopes: GRAPH_SCOPES });
  instance.setActiveAccount(result.account);
  return result;
}

export async function logoutSharePoint(): Promise<void> {
  const instance = await getMsal();
  if (!instance) return;
  const account = getActiveAccount(instance);
  if (account) {
    await instance.logoutPopup({ account });
  }
}

export async function getGraphToken(): Promise<string | null> {
  const instance = await getMsal();
  if (!instance) return null;
  const account = getActiveAccount(instance);
  if (!account) return null;

  try {
    const result = await instance.acquireTokenSilent({
      account,
      scopes: GRAPH_SCOPES,
    });
    return result.accessToken;
  } catch (err) {
    if (err instanceof InteractionRequiredAuthError) {
      const result = await instance.acquireTokenPopup({ scopes: GRAPH_SCOPES });
      return result.accessToken;
    }
    throw err;
  }
}
