import { gitea } from "@dokploy/server/db/schema";
import { SelectFields } from "./common";

export const giteaSafeFields: SelectFields<typeof gitea.$inferSelect> = {
  columns: {
    giteaId: true,
    giteaUrl: true,
    redirectUri: true,
    clientId: true,
    gitProviderId: true,
    expiresAt: true,
    scopes: true,
    lastAuthenticatedAt: true,
  }
} 
