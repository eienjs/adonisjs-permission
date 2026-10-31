import type { EmitterService } from '@adonisjs/core/types';
import type { NormalizeConstructor } from '@adonisjs/core/types/helpers';
import type { BaseModel } from '@adonisjs/lucid/orm';
import type { LucidModel, LucidRow } from '@adonisjs/lucid/types/model';
import type { ManyToMany } from '@adonisjs/lucid/types/relations';
import type { HasRolesMixin, ModelConstructor, RoleInstance } from '../types.js';
import { manyToMany } from '@adonisjs/lucid/orm';
import { emitEvent, RoleAttachedEvent, RoleDetachedEvent } from '../events.js';
import { getPivotColumnNames, getPivotTableNames, ModelResolver } from '../model_resolver.js';
import { PermissionRegistrar } from '../registrar.js';
import { getPermissionsTeamId } from '../team_manager.js';

interface RoleRelationQueryBuilder {
  whereIn: (col: string, values: unknown[]) => RoleRelationQueryBuilder;
  wherePivot: (col: string, val: unknown) => RoleRelationQueryBuilder;
  whereNullPivot: (col: string) => RoleRelationQueryBuilder;
  first: () => Promise<LucidRow | null>;
  then: <TResult1 = RoleInstance[], TResult2 = never>(
    onfulfilled?: ((value: RoleInstance[]) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) => Promise<TResult1 | TResult2>;
}

interface HasRolesInternalInstance {
  currentTeamId?: string | number | null;
  guardName?: string;
  roles: RoleInstance[];
  load: (relation: string) => Promise<void>;
  related: (relation: string) => {
    attach: (payload: Record<string | number, Record<string, unknown>>) => Promise<void>;
    sync: (payload: Record<string | number, Record<string, unknown>>) => Promise<void>;
    detach: (ids: (string | number)[]) => Promise<void>;
    query: () => RoleRelationQueryBuilder;
  };
}

export const HasRoles = <Model extends NormalizeConstructor<typeof BaseModel>>(
  superclass: Model,
): Model & ModelConstructor<InstanceType<Model> & HasRolesMixin> => {
  class ModelWithRoles extends superclass {
    public currentTeamId?: string | number | null;

    @manyToMany(() => ModelResolver.getInstance().getRoleModel() as LucidModel, {
      pivotTable: getPivotTableNames().modelHasRoles,
      pivotForeignKey: getPivotColumnNames().modelMorphKey,
      pivotRelatedForeignKey: getPivotColumnNames().rolePivotKey,
      pivotColumns: [getPivotColumnNames().teamForeignKey],
    })
    public declare roles: ManyToMany<LucidModel>;

    public async assignRole(...roles: (string | LucidRow)[]): Promise<void> {
      const resolver = ModelResolver.getInstance();
      const roleModels = await this.resolveRoles(...roles);
      const self = this as unknown as HasRolesInternalInstance;
      const teamId = self.currentTeamId === undefined ? getPermissionsTeamId() : self.currentTeamId;

      const pivotAttributes: Record<string, unknown> = {};
      if (resolver.config.teams) {
        pivotAttributes[resolver.config.teamForeignKey] = teamId;
      }

      const attachPayload: Record<string | number, Record<string, unknown>> = {};
      for (const r of roleModels) {
        attachPayload[r.id] = pivotAttributes;
      }

      await self.related('roles').attach(attachPayload);
      this.clearRegistrarCache();

      if (!resolver.config.events.enabled) {
        return;
      }

      const ctor = this.constructor as unknown as {
        $app?: { container: { make: (service: 'emitter') => EmitterService } };
      };
      const emitter = ctor.$app?.container.make('emitter');
      for (const r of roleModels) {
        await emitEvent(
          emitter,
          'permission:role_attached',
          new RoleAttachedEvent(this as unknown as LucidRow, r, teamId),
        );
      }
    }

    public async syncRoles(...roles: (string | LucidRow)[]): Promise<void> {
      const resolver = ModelResolver.getInstance();
      const roleModels = await this.resolveRoles(...roles);
      const self = this as unknown as HasRolesInternalInstance;
      const teamId = self.currentTeamId === undefined ? getPermissionsTeamId() : self.currentTeamId;

      const pivotAttributes: Record<string, unknown> = {};
      if (resolver.config.teams) {
        pivotAttributes[resolver.config.teamForeignKey] = teamId;
      }

      const syncPayload: Record<string | number, Record<string, unknown>> = {};
      for (const r of roleModels) {
        syncPayload[r.id] = pivotAttributes;
      }

      await self.related('roles').sync(syncPayload);
      this.clearRegistrarCache();
    }

    public async revokeRole(...roles: (string | LucidRow)[]): Promise<void> {
      const resolver = ModelResolver.getInstance();
      const roleModels = await this.resolveRoles(...roles);
      const self = this as unknown as HasRolesInternalInstance;
      const teamId = self.currentTeamId === undefined ? getPermissionsTeamId() : self.currentTeamId;

      await self.related('roles').detach(roleModels.map((r) => r.id));
      this.clearRegistrarCache();

      if (!resolver.config.events.enabled) {
        return;
      }

      const ctor = this.constructor as unknown as {
        $app?: { container: { make: (service: 'emitter') => EmitterService } };
      };
      const emitter = ctor.$app?.container.make('emitter');
      for (const r of roleModels) {
        await emitEvent(
          emitter,
          'permission:role_detached',
          new RoleDetachedEvent(this as unknown as LucidRow, r, teamId),
        );
      }
    }

    public async hasRole(
      role: string | LucidRow | (string | LucidRow)[],
      _guardName?: string,
    ): Promise<boolean> {
      const roleList = Array.isArray(role)
        ? role
        : (typeof role === 'string' && role.includes('|')
            ? role.split('|')
            : [role]);

      return this.hasAnyRole(...roleList);
    }

    public async hasAnyRole(...roles: (string | LucidRow)[]): Promise<boolean> {
      const resolver = ModelResolver.getInstance();
      const self = this as unknown as HasRolesInternalInstance;
      const teamId = self.currentTeamId === undefined ? getPermissionsTeamId() : self.currentTeamId;
      const targetNames = roles.map((r) => (typeof r === 'string' ? r : (r as unknown as { name: string }).name));

      let query = self.related('roles').query().whereIn('name', targetNames);
      if (resolver.config.teams) {
        if (teamId === null) {
          query = query.whereNullPivot(resolver.config.teamForeignKey);
        } else {
          query = query.wherePivot(resolver.config.teamForeignKey, teamId);
        }
      }

      const found = await query.first();

      return Boolean(found);
    }

    public async hasAllRoles(...roles: (string | LucidRow)[]): Promise<boolean> {
      const resolver = ModelResolver.getInstance();
      const self = this as unknown as HasRolesInternalInstance;
      const teamId = self.currentTeamId === undefined ? getPermissionsTeamId() : self.currentTeamId;
      const targetNames = roles.map((r) => (typeof r === 'string' ? r : (r as unknown as { name: string }).name));

      let query = self.related('roles').query().whereIn('name', targetNames);
      if (resolver.config.teams) {
        if (teamId === null) {
          query = query.whereNullPivot(resolver.config.teamForeignKey);
        } else {
          query = query.wherePivot(resolver.config.teamForeignKey, teamId);
        }
      }

      const foundRoles = await query;

      return foundRoles.length === targetNames.length;
    }

    public async hasExactRoles(...roles: (string | LucidRow)[]): Promise<boolean> {
      const currentNames = await this.getRoleNames();
      const targetNames = roles.map((r) => (typeof r === 'string' ? r : (r as unknown as { name: string }).name));

      if (currentNames.length !== targetNames.length) {
        return false;
      }

      return targetNames.every((t) => currentNames.includes(t));
    }

    public async getRoleNames(): Promise<string[]> {
      const resolver = ModelResolver.getInstance();
      const self = this as unknown as HasRolesInternalInstance;
      const teamId = self.currentTeamId === undefined ? getPermissionsTeamId() : self.currentTeamId;

      let query = self.related('roles').query();
      if (resolver.config.teams) {
        if (teamId === null) {
          query = query.whereNullPivot(resolver.config.teamForeignKey);
        } else {
          query = query.wherePivot(resolver.config.teamForeignKey, teamId);
        }
      }

      const roles = await query;

      return roles.map((r) => r.name);
    }

    protected async resolveRoles(...roles: (string | LucidRow)[]): Promise<RoleInstance[]> {
      const Role = ModelResolver.getInstance().getRoleModel();
      const self = this as unknown as HasRolesInternalInstance;
      const ctor = this.constructor as unknown as { guardName?: string };
      const guard
        = self.guardName
          ?? ctor.guardName
          ?? ModelResolver.getInstance().config.defaultGuard;
      const teamId = self.currentTeamId === undefined ? getPermissionsTeamId() : self.currentTeamId;

      const results: RoleInstance[] = [];
      for (const item of roles) {
        if (typeof item === 'string') {
          const role = await Role.findOrCreate({
            name: item,
            guardName: guard,
            teamId,
          });
          results.push(role);
        } else {
          results.push(item as unknown as RoleInstance);
        }
      }

      return results;
    }

    protected clearRegistrarCache(): void {
      try {
        PermissionRegistrar.getInstance().forgetCachedPermissions();
      } catch {
        // ignore
      }
    }
  }

  return ModelWithRoles as unknown as Model
    & ModelConstructor<InstanceType<Model> & HasRolesMixin>;
};
