import type { LucidModel, LucidRow } from '@adonisjs/lucid/types/model';
import type { PrimaryKeyType } from '../types/main.js';
import { getModelId, normalizeId, toRecordKey } from './model_utils.js';

/**
 * Apply team scoping to a Lucid Model query builder.
 */
export function applyTeamScope<T>(
  query: T,
  teamId: PrimaryKeyType | null | undefined,
  teamForeignKey: string,
): T {
  const q = query as unknown as {
    whereNull: (col: string) => T;
    where: (col: string, val: unknown) => T;
  };

  if (teamId === null || teamId === undefined) {
    return q.whereNull(teamForeignKey);
  }

  return q.where(teamForeignKey, normalizeId(teamId));
}

/**
 * Apply team scoping to a pivot query builder or Lucid relation query.
 */
export function applyTeamPivotScope<T>(
  query: T,
  teamId: PrimaryKeyType | null | undefined,
  teamForeignKey: string,
): T {
  const q = query as unknown as {
    whereNullPivot: (col: string) => T;
    wherePivot: (col: string, val: unknown) => T;
  };

  if (teamId === null || teamId === undefined) {
    return q.whereNullPivot(teamForeignKey);
  }

  return q.wherePivot(teamForeignKey, normalizeId(teamId));
}

/**
 * Build polymorphic pivot payload for Lucid's attach/sync methods.
 */
export function buildMorphPivotPayload(
  items: (LucidRow | { id?: PrimaryKeyType; $primaryKeyValue?: PrimaryKeyType })[],
  morphType: string,
  teamId: PrimaryKeyType | null | undefined,
  teamsEnabled: boolean,
  teamForeignKey: string,
  morphTypeCol: string,
  usesMorphPivot = true,
): Record<string | number, Record<string, unknown>> {
  const pivotAttributes: Record<string, unknown> = {};
  if (usesMorphPivot) {
    pivotAttributes[morphTypeCol] = morphType;
    if (teamsEnabled) {
      pivotAttributes[teamForeignKey] = teamId;
    }
  }

  const payload: Record<string | number, Record<string, unknown>> = {};
  for (const item of items) {
    payload[toRecordKey(getModelId(item))] = pivotAttributes;
  }

  return payload;
}

/**
 * Execute polymorphic model lookup for modelsFor() in Roleable and Permissible.
 */
export async function resolveModelsForMorphPivot<T extends LucidModel>(
  TargetModel: T,
  morphType: string,
  pivotTable: string,
  pivotForeignKey: string,
  pivotId: PrimaryKeyType,
  morphKey: string,
  morphTypeCol: string,
): Promise<InstanceType<T>[]> {
  const normalizedId = normalizeId(pivotId);

  const results = await TargetModel.query().whereIn(TargetModel.primaryKey, (subQuery) => {
    void subQuery
      .from(pivotTable)
      .select(morphKey)
      .where(pivotForeignKey, normalizedId)
      .where(morphTypeCol, morphType);
  });

  return results;
}
