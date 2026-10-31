export { configure } from './configure.js';
export { CatalogSyncer, type SyncOptions } from './src/catalog_syncer.js';
export { defineConfig } from './src/define_config.js';
export { E_PERMISSION_UNAUTHORIZED_ACCESS } from './src/errors.js';
export {
  PermissionAttachedEvent,
  PermissionDetachedEvent,
  type PermissionEvents,
  RoleAttachedEvent,
  RoleDetachedEvent,
} from './src/events.js';
export { HasAuthorizable } from './src/mixins/has_authorizable.js';
export { HasPermissions } from './src/mixins/has_permissions.js';
export { HasRoles } from './src/mixins/has_roles.js';
export { Permissible } from './src/mixins/permissible.js';
export { Roleable } from './src/mixins/roleable.js';
export { ModelResolver } from './src/model_resolver.js';
export { PermissionRegistrar } from './src/registrar.js';
export {
  getPermissionsTeamId,
  runWithTeam,
  setPermissionsTeamId,
  TeamManager,
} from './src/team_manager.js';
export type * from './src/types.js';
export { WildcardPermission } from './src/wildcard.js';
