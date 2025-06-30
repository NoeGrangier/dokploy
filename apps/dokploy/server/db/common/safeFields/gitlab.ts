import { gitlab } from "@dokploy/server/db/schema";
import { SelectFields } from "./common";

export const gitlabSafeFields: SelectFields<typeof gitlab.$inferSelect> = {
  columns: {
    gitlabId: true,
    gitlabUrl: true,
    redirectUri: true,
    groupName: true,
    expiresAt: true,
    applicationId: true,
    gitProviderId: true,
  }
} 
