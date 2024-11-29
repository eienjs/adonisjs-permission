import { type LucidModel } from '@adonisjs/lucid/types/model';
import { type WildcardContract } from './types.js';

export default class WildcardPermission implements WildcardContract {
  public static readonly WILDCARD_TOKEN = '*';

  public static readonly PART_DELIMITER = '.';

  public static readonly SUBPART_DELIMITER = ',';

  protected record: LucidModel;

  public constructor(record: LucidModel) {
    this.record = record;
  }

  public getIndex(): string[] {
    const index: string[] = [];

    return index;
  }

  public implies(permission: string, guardName: string, index: string[]): boolean {
    throw new Error('Method not implemented.');
  }
}
