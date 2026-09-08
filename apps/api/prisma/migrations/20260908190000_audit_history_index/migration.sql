-- CreateIndex
CREATE INDEX "AuditEvent_workspaceId_entityType_entityId_createdAt_idx"
ON "AuditEvent"("workspaceId", "entityType", "entityId", "createdAt");
