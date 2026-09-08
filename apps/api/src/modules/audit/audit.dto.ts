export type AuditActorDto = {
  id: string;
  name: string;
  email: string;
};

export type AuditEventDto = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  actor: AuditActorDto | null;
  before: unknown;
  after: unknown;
  createdAt: string;
};

export function toAuditEventDto(event: {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  before: unknown;
  after: unknown;
  createdAt: Date;
  actor: AuditActorDto | null;
}): AuditEventDto {
  return {
    id: event.id,
    action: event.action,
    entityType: event.entityType,
    entityId: event.entityId,
    before: event.before,
    after: event.after,
    createdAt: event.createdAt.toISOString(),
    actor: event.actor,
  };
}
