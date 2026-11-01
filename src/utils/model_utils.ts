import type { LucidRow } from '@adonisjs/lucid/types/model';
import type { PrimaryKeyType } from '../types/main.js';

/**
 * Normalizes a primary key value for database query parameters.
 * Converts `bigint` to string since Lucid/Knex values do not accept `bigint` directly.
 */
export function normalizeId(value: PrimaryKeyType): string | number {
  return typeof value === 'bigint' ? value.toString() : value;
}

/**
 * Extracts primary key value from a LucidRow instance or model object.
 */
export function getModelId(
  model: LucidRow | { id?: PrimaryKeyType; $primaryKeyValue?: PrimaryKeyType },
): PrimaryKeyType {
  const row = model as unknown as { id: PrimaryKeyType; $primaryKeyValue?: PrimaryKeyType };

  return row.$primaryKeyValue ?? row.id;
}

/**
 * Converts a primary key into a valid JavaScript object record key (string | number).
 */
export function toRecordKey(id: PrimaryKeyType): string | number {
  return typeof id === 'bigint' ? id.toString() : id;
}

/**
 * Extracts string names from an array of model instances or string identifiers.
 */
export function resolveTargetNames(items: (string | LucidRow)[]): string[] {
  return items.map((item) => (typeof item === 'string' ? item : (item as unknown as { name: string }).name));
}
