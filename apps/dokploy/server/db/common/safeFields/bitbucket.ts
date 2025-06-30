import { bitbucket } from "@dokploy/server/db/schema";
import { SelectFields } from "./common";

export const bitbucketSafeFields: SelectFields<typeof bitbucket.$inferSelect> = {
  columns: {
    bitbucketId: true,
    bitbucketUsername: true,
    bitbucketWorkspaceName: true,
    gitProviderId: true,
  }
} 
