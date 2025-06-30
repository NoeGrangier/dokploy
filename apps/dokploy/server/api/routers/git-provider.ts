import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { db } from "@/server/db";
import { apiRemoveGitProvider, gitProvider } from "@/server/db/schema";
import {
	githubSafeFields,
	gitlabSafeFields,
	bitbucketSafeFields,
	giteaSafeFields
} from "@/server/db/common/safeFields";
import { findGitProviderById, removeGitProvider } from "@dokploy/server";
import { computeAllGitProviderRequirements } from "@dokploy/server/services/git-provider-requirements";
import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";

// Type for the API response
export interface GitProviderWithRequirements {
	gitProviderId: string;
	name: string;
	providerType: "github" | "gitlab" | "bitbucket" | "gitea";
	createdAt: string;
	organizationId: string;
	userId: string;
	hasRequirements: boolean;
	github?: {
		githubAppName: string | null;
		githubId: string;
		githubAppId: number | null;
		githubClientId: string | null;
		githubInstallationId: string | null;
		gitProviderId: string;
	};
	gitlab?: {
		gitlabId: string;
		gitlabUrl: string;
		redirectUri: string | null;
		groupName: string | null;
		expiresAt: number | null;
		applicationId: string | null;
		gitProviderId: string;
	};
	bitbucket?: {
		bitbucketId: string;
		bitbucketUsername: string | null;
		bitbucketWorkspaceName: string | null;
		gitProviderId: string;
	};
	gitea?: {
		giteaId: string;
		giteaUrl: string;
		redirectUri: string | null;
		clientId: string | null;
		expiresAt: number | null;
		scopes: string | null;
		lastAuthenticatedAt: number | null;
		gitProviderId: string;
	};
}

export const gitProviderRouter = createTRPCRouter({
	getAll: protectedProcedure.query(async ({ ctx }): Promise<GitProviderWithRequirements[]> => {
		const providers = await db.query.gitProvider.findMany({
			with: {
				gitlab: gitlabSafeFields,
				bitbucket: bitbucketSafeFields,
				github: githubSafeFields,
				gitea: giteaSafeFields,
			},
			orderBy: desc(gitProvider.createdAt),
			where: and(
				eq(gitProvider.userId, ctx.session.userId),
				eq(gitProvider.organizationId, ctx.session.activeOrganizationId),
			),
		});

		// Compute requirements for all providers
		const providerIds = providers.map(p => p.gitProviderId);
		const requirements = await computeAllGitProviderRequirements(providerIds);

		// Create a map for quick lookup
		const requirementsMap = new Map(
			requirements.map(req => [req.gitProviderId, req.hasRequirements])
		);

		// Add requirements to each provider and handle optional fields
		const providersWithRequirements = providers.map(provider => {
			const baseProvider = {
				gitProviderId: provider.gitProviderId,
				name: provider.name,
				providerType: provider.providerType,
				createdAt: provider.createdAt,
				organizationId: provider.organizationId,
				userId: provider.userId,
				hasRequirements: requirementsMap.get(provider.gitProviderId) ?? false,
			};

			// Only include git provider data if it exists and has content
			const result: GitProviderWithRequirements = { ...baseProvider };

			if (provider.github && Object.keys(provider.github).length > 0) {
				result.github = provider.github as GitProviderWithRequirements['github'];
			}

			if (provider.gitlab && Object.keys(provider.gitlab).length > 0) {
				result.gitlab = provider.gitlab as GitProviderWithRequirements['gitlab'];
			}

			if (provider.bitbucket && Object.keys(provider.bitbucket).length > 0) {
				result.bitbucket = provider.bitbucket as GitProviderWithRequirements['bitbucket'];
			}

			if (provider.gitea && Object.keys(provider.gitea).length > 0) {
				result.gitea = provider.gitea as GitProviderWithRequirements['gitea'];
			}

			return result;
		});

		return providersWithRequirements;
	}),
	remove: protectedProcedure
		.input(apiRemoveGitProvider)
		.mutation(async ({ input, ctx }) => {
			try {
				const gitProvider = await findGitProviderById(input.gitProviderId);

				if (gitProvider.organizationId !== ctx.session.activeOrganizationId) {
					throw new TRPCError({
						code: "UNAUTHORIZED",
						message: "You are not allowed to delete this Git provider",
					});
				}
				return await removeGitProvider(input.gitProviderId);
			} catch (error) {
				const message =
					error instanceof Error
						? error.message
						: "Error deleting this Git provider";
				throw new TRPCError({
					code: "BAD_REQUEST",
					message,
				});
			}
		}),
});
