import type { EmitterService } from '@adonisjs/core/types';
import type { LucidRow } from '@adonisjs/lucid/types/model';
import type { PermissionEvents, PrimaryKeyType } from './types/main.js';

export class RoleAttachedEvent {
  public constructor(
    public model: LucidRow,
    public role: LucidRow | string,
    public teamId?: PrimaryKeyType | null,
  ) {}
}

export class RoleDetachedEvent {
  public constructor(
    public model: LucidRow,
    public role: LucidRow | string,
    public teamId?: PrimaryKeyType | null,
  ) {}
}

export class PermissionAttachedEvent {
  public constructor(
    public model: LucidRow,
    public permission: LucidRow | string,
    public teamId?: PrimaryKeyType | null,
  ) {}
}

export class PermissionDetachedEvent {
  public constructor(
    public model: LucidRow,
    public permission: LucidRow | string,
    public teamId?: PrimaryKeyType | null,
  ) {}
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
