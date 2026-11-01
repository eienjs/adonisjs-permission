import type { EmitterService } from '@adonisjs/core/types';
import type { NormalizeConstructor } from '@adonisjs/core/types/helpers';
import type { BaseModel } from '@adonisjs/lucid/orm';
import type { LucidModel, LucidRow } from '@adonisjs/lucid/types/model';
import type { ManyToMany } from '@adonisjs/lucid/types/relations';
import type {
  HasPermissionsMixin,
  ModelConstructor,
  PermissionInstance,
  PrimaryKeyType,
} from '../types.js';
import { manyToMany } from '@adonisjs/lucid/orm';
import { emitEvent, PermissionAttachedEvent, PermissionDetachedEvent } from '../events.js';
import { getPivotColumnNames, getPivotTableNames, ModelResolver } from '../model_resolver.js';
import { PermissionRegistrar } from '../registrar.js';
import { getPermissionsTeamId } from '../team_manager.js';
import { getModelId, toRecordKey } from '../utils/model_utils.js';
import { applyTeamPivotScope, buildMorphPivotPayload } from '../utils/pivot_utils.js';

interface PermissionRelationQueryBuilder {
  where: (col: string, val: unknown) => PermissionRelationQueryBuilder;
  wherePivot: (col: string, val: unknown) => PermissionRelationQueryBuilder;
  whereNullPivot: (col: string) => PermissionRelationQueryBuilder;
  first: () => Promise<LucidRow | null>;
  then: <TResult1 = PermissionInstance[], TResult2 = never>(
    onfulfilled?: ((value: PermissionInstance[]) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) => Promise<TResult1 | TResult2>;
}

interface PivotQueryBuilder {
  wherePivot: (col: string, val: unknown) => PivotQueryBuilder;
  whereNullPivot: (col: string) => PivotQueryBuilder;
  whereInPivot: (col: string, vals: PrimaryKeyType[]) => PivotQueryBuilder;
  del: () => Promise<number>;
}

interface HasPermissionsInternalInstance {
  currentTeamId?: PrimaryKeyType | null;
  usesMorphPivot?: boolean;
  guardName?: string;
  permissions: PermissionInstance[];
  load: (relation: string) => Promise<void>;
  related: (relation: string) => {
    attach: (payload: Record<string | number, Record<string, unknown>> | (string | number)[]) => Promise<void>;
    sync: (payload: Record<string | number, Record<string, unknown>>) => Promise<void>;
    detach: (ids?: (string | number)[]) => Promise<void>;
    pivotQuery: () => PivotQueryBuilder;
    query: () => PermissionRelationQueryBuilder;
  };
}

export const HasPermissions = <Model extends NormalizeConstructor<typeof BaseModel>>(
  superclass: Model,
): Model & ModelConstructor<InstanceType<Model> & HasPermissionsMixin> => {
  class ModelWithPermissions extends superclass {
    public currentTeamId?: PrimaryKeyType | null;

    protected usesMorphPivot = true;

    @manyToMany(() => ModelResolver.getInstance().getPermissionModel() as LucidModel, {
      pivotTable: getPivotTableNames().modelHasPermissions,
      pivotForeignKey: getPivotColumnNames().modelMorphKey,
      pivotRelatedForeignKey: getPivotColumnNames().permissionPivotKey,
      pivotColumns: [getPivotColumnNames().modelMorphType, getPivotColumnNames().teamForeignKey],
    })
    public declare permissions: ManyToMany<LucidModel>;

    public async givePermissionTo(
      ...permissions: (string | LucidRow)[]
    ): Promise<void> {
      const resolver = ModelResolver.getInstance();
      const permModels = await this.resolvePermissions(...permissions);
      if (permModels.length === 0) {
        return;
      }

      const self = this as unknown as HasPermissionsInternalInstance;
      const teamId = self.currentTeamId === undefined ? getPermissionsTeamId() : self.currentTeamId;
      const morphType = resolver.getMorphType(this.constructor);

      const attachPayload = buildMorphPivotPayload(
        permModels,
        morphType,
        teamId,
        resolver.config.teams,
        resolver.config.teamForeignKey,
        resolver.config.columnNames.modelMorphType,
        self.usesMorphPivot !== false,
      );

      await self.related('permissions').attach(attachPayload);
      this.clearRegistrarCache();

      if (!resolver.config.events.enabled) {
        return;
      }

      const ctor = this.constructor as unknown as {
        $app?: { container: { make: (service: 'emitter') => EmitterService } };
      };
      const emitter = ctor.$app?.container.make('emitter');
      for (const p of permModels) {
        await emitEvent(
          emitter,
          'permission:permission_attached',
          new PermissionAttachedEvent(this as unknown as LucidRow, p, teamId),
        );
      }
    }

    public async syncPermissions(
      ...permissions: (string | LucidRow)[]
    ): Promise<void> {
      const resolver = ModelResolver.getInstance();
      const permModels = await this.resolvePermissions(...permissions);
      const self = this as unknown as HasPermissionsInternalInstance;
      const teamId = self.currentTeamId === undefined ? getPermissionsTeamId() : self.currentTeamId;

      if (self.usesMorphPivot === false) {
        await self.related('permissions').detach();
        if (permModels.length > 0) {
          const syncPayload: Record<string | number, Record<string, unknown>> = {};
          for (const p of permModels) {
            syncPayload[toRecordKey(getModelId(p))] = {};
          }

          await self.related('permissions').attach(syncPayload);
        }
        this.clearRegistrarCache();

        return;
      }

      const morphType = resolver.getMorphType(this.constructor);
      let pivotQuery = self
        .related('permissions')
        .pivotQuery()
        .wherePivot(resolver.config.columnNames.modelMorphType, morphType);

      if (resolver.config.teams) {
        pivotQuery = applyTeamPivotScope(pivotQuery, teamId, resolver.config.teamForeignKey);
      }

      await pivotQuery.del();

      if (permModels.length > 0) {
        const syncPayload = buildMorphPivotPayload(
          permModels,
          morphType,
          teamId,
          resolver.config.teams,
          resolver.config.teamForeignKey,
          resolver.config.columnNames.modelMorphType,
          true,
        );

        await self.related('permissions').attach(syncPayload);
      }

      this.clearRegistrarCache();
    }

    public async revokePermissionTo(
      ...permissions: (string | LucidRow)[]
    ): Promise<void> {
      const resolver = ModelResolver.getInstance();
      const permModels = await this.resolvePermissions(...permissions);
      if (permModels.length === 0) {
        return;
      }

      const self = this as unknown as HasPermissionsInternalInstance;
      const teamId = self.currentTeamId === undefined ? getPermissionsTeamId() : self.currentTeamId;

      if (self.usesMorphPivot === false) {
        await self
          .related('permissions')
          .detach(permModels.map((p) => toRecordKey(getModelId(p))));
      } else {
        const morphType = resolver.getMorphType(this.constructor);
        let pivotQuery = self
          .related('permissions')
          .pivotQuery()
          .wherePivot(resolver.config.columnNames.modelMorphType, morphType)
          .whereInPivot(
            resolver.config.columnNames.permissionPivotKey,
            permModels.map((p) => getModelId(p)),
          );

        if (resolver.config.teams) {
          pivotQuery = applyTeamPivotScope(pivotQuery, teamId, resolver.config.teamForeignKey);
        }

        await pivotQuery.del();
      }

      this.clearRegistrarCache();

      if (!resolver.config.events.enabled) {
        return;
      }

      const ctor = this.constructor as unknown as {
        $app?: { container: { make: (service: 'emitter') => EmitterService } };
      };
      const emitter = ctor.$app?.container.make('emitter');
      for (const p of permModels) {
        await emitEvent(
          emitter,
          'permission:permission_detached',
          new PermissionDetachedEvent(this as unknown as LucidRow, p, teamId),
        );
      }
    }

    public async hasDirectPermission(
      permission: string | LucidRow,
    ): Promise<boolean> {
      const resolver = ModelResolver.getInstance();
      const targetName = typeof permission === 'string' ? permission : (permission as unknown as { name: string }).name;
      const self = this as unknown as HasPermissionsInternalInstance;
      const teamId = self.currentTeamId === undefined ? getPermissionsTeamId() : self.currentTeamId;

      let query = self.related('permissions').query().where('name', targetName);

      if (self.usesMorphPivot !== false) {
        query = query.wherePivot(
          resolver.config.columnNames.modelMorphType,
          resolver.getMorphType(this.constructor),
        );

        if (resolver.config.teams) {
          query = applyTeamPivotScope(query, teamId, resolver.config.teamForeignKey);
        }
      }

      const found = await query.first();

      return Boolean(found);
    }

    public async hasPermissionTo(
      permission: string | LucidRow,
      _guardName?: string,
    ): Promise<boolean> {
      return this.hasDirectPermission(permission);
    }

    public async hasAnyPermission(
      ...permissions: (string | LucidRow)[]
    ): Promise<boolean> {
      for (const p of permissions) {
        if (await this.hasPermissionTo(p)) {
          return true;
        }
      }

      return false;
    }

    public async hasAllPermissions(
      ...permissions: (string | LucidRow)[]
    ): Promise<boolean> {
      for (const p of permissions) {
        if (!(await this.hasPermissionTo(p))) {
          return false;
        }
      }

      return true;
    }

    public async getDirectPermissions(): Promise<LucidRow[]> {
      const resolver = ModelResolver.getInstance();
      const self = this as unknown as HasPermissionsInternalInstance;
      const teamId = self.currentTeamId === undefined ? getPermissionsTeamId() : self.currentTeamId;

      let query = self.related('permissions').query();
      if (self.usesMorphPivot !== false) {
        query = query.wherePivot(
          resolver.config.columnNames.modelMorphType,
          resolver.getMorphType(this.constructor),
        );

        if (resolver.config.teams) {
          query = applyTeamPivotScope(query, teamId, resolver.config.teamForeignKey);
        }
      }

      const permissions = await query;

      return permissions;
    }

    public async getPermissionNames(): Promise<string[]> {
      const permissions = await this.getDirectPermissions();

      return permissions.map((p) => (p as unknown as { name: string }).name);
    }

    protected async resolvePermissions(
      ...permissions: (string | LucidRow)[]
    ): Promise<PermissionInstance[]> {
      const Permission = ModelResolver.getInstance().getPermissionModel();
      const self = this as unknown as HasPermissionsInternalInstance;
      const ctor = this.constructor as unknown as { guardName?: string };
      const guard
        = self.guardName
          ?? ctor.guardName
          ?? ModelResolver.getInstance().config.defaultGuard;

      const results: PermissionInstance[] = [];
      for (const item of permissions) {
        if (typeof item === 'string') {
          const perm = await Permission.findOrCreate({
            name: item,
            guardName: guard,
          });
          results.push(perm);
        } else {
          results.push(item as unknown as PermissionInstance);
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

  return ModelWithPermissions as unknown as Model
    & ModelConstructor<InstanceType<Model> & HasPermissionsMixin>;
};
