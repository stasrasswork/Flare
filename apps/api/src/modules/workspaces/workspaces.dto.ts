import type { MembershipRole } from "../../generated/prisma/client.js";

export type EnvironmentDto = {
  id: string;
  key: string;
  name: string;
  sdkServerKey: string;
  sdkClientKey: string;
};

export type WorkspaceSummaryDto = {
  id: string;
  name: string;
  slug: string;
  role: MembershipRole;
};

export type WorkspaceDto = WorkspaceSummaryDto & {
  environments: EnvironmentDto[];
};

export function toEnvironmentDto(environment: EnvironmentDto): EnvironmentDto {
  return {
    id: environment.id,
    key: environment.key,
    name: environment.name,
    sdkServerKey: environment.sdkServerKey,
    sdkClientKey: environment.sdkClientKey,
  };
}

export function toWorkspaceSummaryDto(
  workspace: { id: string; name: string; slug: string },
  role: MembershipRole,
): WorkspaceSummaryDto {
  return {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    role,
  };
}

export function toWorkspaceDto(
  workspace: {
    id: string;
    name: string;
    slug: string;
    environments: EnvironmentDto[];
  },
  role: MembershipRole,
): WorkspaceDto {
  return {
    ...toWorkspaceSummaryDto(workspace, role),
    environments: workspace.environments.map(toEnvironmentDto),
  };
}
