import type { WorkspaceSummaryDto } from "../workspaces/workspaces.dto.ts";

export type UserDto = {
  id: string;
  email: string;
  name: string;
};

export type MeDto = {
  user: UserDto;
  workspaces: WorkspaceSummaryDto[];
};

export function toUserDto(user: { id: string; email: string; name: string }): UserDto {
  return { id: user.id, email: user.email, name: user.name };
}
