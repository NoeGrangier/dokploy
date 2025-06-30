import { github } from "@dokploy/server/db/schema";
import { SelectFields } from "./common";

export const githubSafeFields: SelectFields<typeof github.$inferSelect> = {
  columns: {
    githubAppName: true,
    githubId: true,
    githubAppId: true,
    githubClientId: true,
    githubInstallationId: true,
    gitProviderId: true,
  }
}
