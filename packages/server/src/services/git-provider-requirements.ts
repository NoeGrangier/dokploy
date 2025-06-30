import { db } from "@dokploy/server/db";
import { gitProvider } from "@dokploy/server/db/schema";
import { eq } from "drizzle-orm";

export interface GitProviderRequirements {
  gitProviderId: string;
  providerType: "github" | "gitlab" | "bitbucket" | "gitea";
  hasRequirements: boolean;
}

export const computeGitProviderRequirements = async (
  gitProviderId: string,
): Promise<GitProviderRequirements> => {
  const provider = await db.query.gitProvider.findFirst({
    where: eq(gitProvider.gitProviderId, gitProviderId),
    with: {
      github: true,
      gitlab: true,
      bitbucket: true,
      gitea: true,
    },
  });

  if (!provider) {
    throw new Error("Git provider not found");
  }

  let hasRequirements = false;

  switch (provider.providerType) {
    case "github":
      hasRequirements = !!(
        provider.github?.githubAppId &&
        provider.github?.githubPrivateKey &&
        provider.github?.githubInstallationId
      );
      break;
    case "gitlab":
      hasRequirements = !!(
        provider.gitlab?.accessToken &&
        provider.gitlab?.refreshToken
      );
      break;
    case "bitbucket":
      hasRequirements = !!(
        provider.bitbucket?.bitbucketUsername &&
        provider.bitbucket?.appPassword
      );
      break;
    case "gitea":
      hasRequirements = !!(
        provider.gitea?.clientId &&
        provider.gitea?.clientSecret
      );
      break;
  }

  return {
    gitProviderId: provider.gitProviderId,
    providerType: provider.providerType,
    hasRequirements,
  };
};

export const computeAllGitProviderRequirements = async (
  gitProviderIds: string[],
): Promise<GitProviderRequirements[]> => {
  const requirements: GitProviderRequirements[] = [];

  for (const gitProviderId of gitProviderIds) {
    try {
      const requirement = await computeGitProviderRequirements(gitProviderId);
      requirements.push(requirement);
    } catch (error) {
      // Skip providers that can't be found or have errors
      console.error(`Error computing requirements for ${gitProviderId}:`, error);
    }
  }

  return requirements;
}; 
