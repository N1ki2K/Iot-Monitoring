export interface AuditLogEntry {
  id: number;
  actor_id: number | null;
  actor_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface AuditLogQueryParams {
  page?: number;
  limit?: number;
  actorId?: number;
  action?: string;
  entityType?: string;
  entityId?: string;
}
