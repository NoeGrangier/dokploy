import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import {
	apiCreateGitlab,
	apiFindGitlabBranches,
	apiFindOneGitlab,
	apiGitlabTestConnection,
	apiUpdateGitlab,
} from "@/server/db/schema";

import { db } from "@/server/db";
import {
	createGitlab,
	findGitlabById,
	getGitlabBranches,
	getGitlabRepositories,
	haveGitlabRequirements,
	testGitlabConnection,
	updateGitProvider,
	updateGitlab,
} from "@dokploy/server";
import { computeGitProviderRequirements } from "@dokploy/server/services/git-provider-requirements";
import { TRPCError } from "@trpc/server";

export const gitlabRouter = createTRPCRouter({
	create: protectedProcedure
		.input(apiCreateGitlab)
		.mutation(async ({ input, ctx }) => {
			try {
				return await createGitlab(
					input,
					ctx.session.activeOrganizationId,
					ctx.session.userId,
				);
			} catch (error) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Error creating this Gitlab provider",
					cause: error,
				});
			}
		}),
	one: protectedProcedure
		.input(apiFindOneGitlab)
		.query(async ({ input, ctx }) => {
			const gitlabProvider = await findGitlabById(input.gitlabId);
			if (
				gitlabProvider.gitProvider.organizationId !==
				ctx.session.activeOrganizationId &&
				gitlabProvider.gitProvider.userId !== ctx.session.userId
			) {
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "You are not allowed to access this Gitlab provider",
				});
			}
			return gitlabProvider;
		}),
	gitlabProviders: protectedProcedure.query(async ({ ctx }) => {
		let result = await db.query.gitlab.findMany({
			with: {
				gitProvider: true,
			},
		});

		result = result.filter((provider) => {
			return (
				provider.gitProvider.organizationId ===
				ctx.session.activeOrganizationId &&
				provider.gitProvider.userId === ctx.session.userId
			);
		});

		// Compute requirements for each provider
		const providersWithRequirements = await Promise.all(
			result.map(async (provider) => {
				const requirements = await computeGitProviderRequirements(provider.gitProvider.gitProviderId);

				return {
					gitlabId: provider.gitlabId,
					gitlabUrl: provider.gitlabUrl,
					redirectUri: provider.redirectUri,
					groupName: provider.groupName,
					expiresAt: provider.expiresAt,
					gitProvider: {
						...provider.gitProvider,
					},
					hasRequirements: requirements.hasRequirements,
				};
			})
		);

		return providersWithRequirements;
	}),
	getGitlabRepositories: protectedProcedure
		.input(apiFindOneGitlab)
		.query(async ({ input, ctx }) => {
			const gitlabProvider = await findGitlabById(input.gitlabId);
			if (
				gitlabProvider.gitProvider.organizationId !==
				ctx.session.activeOrganizationId &&
				gitlabProvider.gitProvider.userId !== ctx.session.userId
			) {
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "You are not allowed to access this Gitlab provider",
				});
			}
			return await getGitlabRepositories(input.gitlabId);
		}),

	getGitlabBranches: protectedProcedure
		.input(apiFindGitlabBranches)
		.query(async ({ input, ctx }) => {
			const gitlabProvider = await findGitlabById(input.gitlabId || "");
			if (
				gitlabProvider.gitProvider.organizationId !==
				ctx.session.activeOrganizationId &&
				gitlabProvider.gitProvider.userId !== ctx.session.userId
			) {
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "You are not allowed to access this Gitlab provider",
				});
			}
			return await getGitlabBranches(input);
		}),
	testConnection: protectedProcedure
		.input(apiGitlabTestConnection)
		.mutation(async ({ input, ctx }) => {
			try {
				const gitlabProvider = await findGitlabById(input.gitlabId || "");
				if (
					gitlabProvider.gitProvider.organizationId !==
					ctx.session.activeOrganizationId &&
					gitlabProvider.gitProvider.userId !== ctx.session.userId
				) {
					throw new TRPCError({
						code: "UNAUTHORIZED",
						message: "You are not allowed to access this Gitlab provider",
					});
				}
				const result = await testGitlabConnection(input);

				return `Found ${result} repositories`;
			} catch (error) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: error instanceof Error ? error?.message : `Error: ${error}`,
				});
			}
		}),
	update: protectedProcedure
		.input(apiUpdateGitlab)
		.mutation(async ({ input, ctx }) => {
			const gitlabProvider = await findGitlabById(input.gitlabId);
			if (
				gitlabProvider.gitProvider.organizationId !==
				ctx.session.activeOrganizationId &&
				gitlabProvider.gitProvider.userId !== ctx.session.userId
			) {
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "You are not allowed to access this Gitlab provider",
				});
			}
			if (input.name) {
				await updateGitProvider(input.gitProviderId, {
					name: input.name,
					organizationId: ctx.session.activeOrganizationId,
				});

				await updateGitlab(input.gitlabId, {
					...input,
				});
			} else {
				await updateGitlab(input.gitlabId, {
					...input,
				});
			}
		}),
});
