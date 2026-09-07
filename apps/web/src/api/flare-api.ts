import { request } from "./client";
import type {
  Flag,
  CreateFlagInput,
  Me,
  UpdateFlagInput,
  UpdateFlagStateInput,
  User,
  Workspace,
} from "../types/flare";

export const flareApi = {
  login(email: string, password: string) {
    return request<{ user: User }>("/auth/login", {
      method: "POST",
      body: { email, password },
    });
  },

  logout() {
    return request<void>("/auth/logout", { method: "POST" });
  },

  getMe() {
    return request<Me>("/auth/me");
  },

  getWorkspace(workspaceId?: string) {
    return request<{ workspace: Workspace }>("/workspaces/me", { workspaceId });
  },

  listFlags(workspaceId: string) {
    return request<{ flags: Flag[] }>("/flags", { workspaceId });
  },

  createFlag(workspaceId: string, input: CreateFlagInput) {
    return request<{ flag: Flag }>("/flags", { method: "POST", workspaceId, body: input });
  },

  updateFlag(workspaceId: string, flagId: string, input: UpdateFlagInput) {
    return request<{ flag: Flag }>(`/flags/${flagId}`, { method: "PATCH", workspaceId, body: input });
  },

  archiveFlag(workspaceId: string, flagId: string) {
    return request<{ flag: Flag }>(`/flags/${flagId}`, { method: "DELETE", workspaceId });
  },

  updateFlagState(
    workspaceId: string,
    flagId: string,
    environmentId: string,
    input: UpdateFlagStateInput,
  ) {
    return request<{ flag: Flag }>(`/flags/${flagId}/environments/${environmentId}`, {
      method: "PUT",
      workspaceId,
      body: input,
    });
  },

  getConnectionCount(workspaceId: string, environmentId: string) {
    return request<{ count: number }>(`/environments/${environmentId}/connections`, {
      workspaceId,
    });
  },
};
