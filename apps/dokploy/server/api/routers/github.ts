import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { db } from "@/server/db";
import {
	apiFindGithubBranches,
	apiFindOneGithub,
	apiUpdateGithub,
} from "@/server/db/schema";
import { githubSafeFields } from "@/server/db/common/safeFields/github";
import {
	findGithubById,
	getGithubBranches,
	getGithubRepositories,
	haveGithubRequirements,
	updateGitProvider,
} from "@dokploy/server";
import { computeGitProviderRequirements } from "@dokploy/server/services/git-provider-requirements";
import { TRPCError } from "@trpc/server";

export const githubRouter = createTRPCRouter({
	one: protectedProcedure
		.input(apiFindOneGithub)
		.query(async ({ input, ctx }) => {
			const githubProvider = await findGithubById(input.githubId);
			if (
				githubProvider.gitProvider.organizationId !==
				ctx.session.activeOrganizationId &&
				githubProvider.gitProvider.userId === ctx.session.userId
			) {
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "You are not allowed to access this github provider",
				});
			}
			return githubProvider;
		}),
	getGithubRepositories: protectedProcedure
		.input(apiFindOneGithub)
		.query(async ({ input, ctx }) => {
			const githubProvider = await findGithubById(input.githubId);
			if (
				githubProvider.gitProvider.organizationId !==
				ctx.session.activeOrganizationId &&
				githubProvider.gitProvider.userId === ctx.session.userId
			) {
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "You are not allowed to access this github provider",
				});
			}
			return await getGithubRepositories(input.githubId);
		}),
	getGithubBranches: protectedProcedure
		.input(apiFindGithubBranches)
		.query(async ({ input, ctx }) => {
			const githubProvider = await findGithubById(input.githubId || "");
			if (
				githubProvider.gitProvider.organizationId !==
				ctx.session.activeOrganizationId &&
				githubProvider.gitProvider.userId === ctx.session.userId
			) {
				//TODO: Remove this line when the cloud version is ready
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "You are not allowed to access this github provider",
				});
			}
			return await getGithubBranches(input);
		}),
	githubProviders: protectedProcedure.query(async ({ ctx }) => {
		let result = await db.query.github.findMany({
			with: {
				gitProvider: true,
			},
		});

		result = result.filter(
			(provider) =>
				provider.gitProvider.organizationId ===
				ctx.session.activeOrganizationId &&
				provider.gitProvider.userId === ctx.session.userId,
		);

		// Compute requirements for each provider
		const providersWithRequirements = await Promise.all(
			result.map(async (provider) => {
				const requirements = await computeGitProviderRequirements(provider.gitProvider.gitProviderId);

				return {
					githubId: provider.githubId,
					githubAppName: provider.githubAppName,
					githubAppId: provider.githubAppId,
					githubClientId: provider.githubClientId,
					githubInstallationId: provider.githubInstallationId,
					gitProvider: {
						...provider.gitProvider,
					},
					hasRequirements: requirements.hasRequirements,
				};
			})
		);

		return providersWithRequirements;
	}),

	testConnection: protectedProcedure
		.input(apiFindOneGithub)
		.mutation(async ({ input, ctx }) => {
			try {
				const githubProvider = await findGithubById(input.githubId);
				if (
					githubProvider.gitProvider.organizationId !==
					ctx.session.activeOrganizationId &&
					githubProvider.gitProvider.userId === ctx.session.userId
				) {
					throw new TRPCError({
						code: "UNAUTHORIZED",
						message: "You are not allowed to access this github provider",
					});
				}
				const result = await getGithubRepositories(input.githubId);
				return `Found ${result.length} repositories`;
			} catch (err) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: err instanceof Error ? err?.message : `Error: ${err}`,
				});
			}
		}),
	update: protectedProcedure
		.input(apiUpdateGithub)
		.mutation(async ({ input, ctx }) => {
			const githubProvider = await findGithubById(input.githubId);
			if (
				githubProvider.gitProvider.organizationId !==
				ctx.session.activeOrganizationId &&
				githubProvider.gitProvider.userId === ctx.session.userId
			) {
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "You are not allowed to access this github provider",
				});
			}
			await updateGitProvider(input.gitProviderId, {
				name: input.name,
				organizationId: ctx.session.activeOrganizationId,
			});
		}),
});
