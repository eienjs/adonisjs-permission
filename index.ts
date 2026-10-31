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
export { HasAuthorizable, hasAuthorizable } from './src/mixins/has_authorizable.js';
export { HasPermissions, hasPermissions } from './src/mixins/has_permissions.js';
export { HasRoles, hasRoles } from './src/mixins/has_roles.js';
export { Permissible, permissible } from './src/mixins/permissible.js';

// Mixins
export { Roleable, roleable } from './src/mixins/roleable.js';
export { ModelResolver } from './src/model_resolver.js';
export { PermissionRegistrar } from './src/registrar.js';
export {
  getPermissionsTeamId,
  runWithTeam,
  setPermissionsTeamId,
  TeamManager,
} from './src/team_manager.js';
// Types
export type * from './src/types.js';

export { WildcardPermission } from './src/wildcard.js';
export { defineConfig } from './src/define_config.js';
export { E_PERMISSION_UNAUTHORIZED_ACCESS } from './src/errors.js';
export { WildcardPermission } from './src/wildcard.js';
export {
  RoleAttachedEvent,
  RoleDetachedEvent,
  PermissionAttachedEvent,
  PermissionDetachedEvent,
  type PermissionEvents,
} from './src/events.js';
export {
  TeamManager,
  setPermissionsTeamId,
  getPermissionsTeamId,
  runWithTeam,
} from './src/team_manager.js';
export { PermissionRegistrar } from './src/registrar.js';
export { CatalogSyncer, type SyncOptions } from './src/catalog_syncer.js';
export { ModelResolver } from './src/model_resolver.js';

// Mixins
export { Roleable, roleable } from './src/mixins/roleable.js';
export { Permissible, permissible } from './src/mixins/permissible.js';
export { HasRoles, hasRoles } from './src/mixins/has_roles.js';
export { HasPermissions, hasPermissions } from './src/mixins/has_permissions.js';
export { HasAuthorizable, hasAuthorizable } from './src/mixins/has_authorizable.js';

// Types
export type * from './src/types.js';
