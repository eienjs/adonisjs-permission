import type { EmitterService } from '@adonisjs/core/types';
import type { LucidRow } from '@adonisjs/lucid/types/model';

export class RoleAttachedEvent {
  public constructor(
    public model: LucidRow,
    public role: LucidRow | string,
    public teamId?: string | number | null,
  ) {}
}

export class RoleDetachedEvent {
  public constructor(
    public model: LucidRow,
    public role: LucidRow | string,
    public teamId?: string | number | null,
  ) {}
}

export class PermissionAttachedEvent {
  public constructor(
    public model: LucidRow,
    public permission: LucidRow | string,
    public teamId?: string | number | null,
  ) {}
}

export class PermissionDetachedEvent {
  public constructor(
    public model: LucidRow,
    public permission: LucidRow | string,
    public teamId?: string | number | null,
  ) {}
}

export interface PermissionEvents {
  'permission:role_attached': RoleAttachedEvent;
  'permission:role_detached': RoleDetachedEvent;
  'permission:permission_attached': PermissionAttachedEvent;
  'permission:permission_detached': PermissionDetachedEvent;
}

declare module '@adonisjs/core/types' {
  interface EventsList extends PermissionEvents {}
}

export async function emitEvent<K extends keyof PermissionEvents>(
  emitter: EmitterService | undefined | null,
  event: K,
  payload: PermissionEvents[K],
): Promise<void> {
  if (!emitter) {
    return;
  }

  await (emitter as unknown as { emit: (e: string, data: unknown) => Promise<void> }).emit(
    event,
    payload,
  );
}
