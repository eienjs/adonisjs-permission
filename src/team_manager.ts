import { AsyncLocalStorage } from 'node:async_hooks';

interface TeamStore {
  teamId: string | number | null;
}

export class TeamManager {
  private static instance: TeamManager = new TeamManager();

  private storage = new AsyncLocalStorage<TeamStore>();

  private fallbackTeamId: string | number | null = null;

  public setTeamId(teamId: string | number | null): void {
    const store = this.storage.getStore();
    if (store) {
      store.teamId = teamId;
    } else {
      this.fallbackTeamId = teamId;
    }
  }

  public getTeamId(): string | number | null {
    return this.storage.getStore()?.teamId ?? this.fallbackTeamId;
  }

  public async runWithTeam<T>(teamId: string | number | null, callback: () => T | Promise<T>): Promise<T> {
    return this.storage.run({ teamId }, async () => {
      return callback();
    });
  }

  public static getInstance(): TeamManager {
    return this.instance;
  }
}

export const setPermissionsTeamId = (teamId: string | number | null): void => {
  TeamManager.getInstance().setTeamId(teamId);
};

export const getPermissionsTeamId = (): string | number | null => {
  return TeamManager.getInstance().getTeamId();
};

export const runWithTeam = async <T>(
  teamId: string | number | null,
  callback: () => T | Promise<T>,
): Promise<T> => {
  return TeamManager.getInstance().runWithTeam(teamId, callback);
};
