export interface WildcardContract {
  getIndex(): string[];

  implies(permission: string, guardName: string, index: string[]): boolean;
}
