import type { PrimaryKeyType } from './types.js';
import { AsyncLocalStorage } from 'node:async_hooks';

interface TeamStore {
  teamId: PrimaryKeyType | null;
}

export class TeamManager {
  private static instance: TeamManager = new TeamManager();

  private storage = new AsyncLocalStorage<TeamStore>();

  private fallbackTeamId: PrimaryKeyType | null = null;

  public setTeamId(teamId: PrimaryKeyType | null): void {
    const store = this.storage.getStore();
    if (store) {
      store.teamId = teamId;
    } else {
      this.fallbackTeamId = teamId;
    }
  }

  public getTeamId(): PrimaryKeyType | null {
    return this.storage.getStore()?.teamId ?? this.fallbackTeamId;
  }

  public async runWithTeam<T>(teamId: PrimaryKeyType | null, callback: () => T | Promise<T>): Promise<T> {
    return this.storage.run({ teamId }, async () => {
      return callback();
    });
  }

  public static getInstance(): TeamManager {
    return this.instance;
  }
}

export const setPermissionsTeamId = (teamId: PrimaryKeyType | null): void => {
  TeamManager.getInstance().setTeamId(teamId);
};

export const getPermissionsTeamId = (): PrimaryKeyType | null => {
  return TeamManager.getInstance().getTeamId();
};

export const runWithTeam = async <T>(
  teamId: PrimaryKeyType | null,
  callback: () => T | Promise<T>,
): Promise<T> => {
  return TeamManager.getInstance().runWithTeam(teamId, callback);
};
