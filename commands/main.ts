export const commands = [
  async () => import('./sync.js'),
  async () => import('./sync_permissions.js'),
  async () => import('./sync_roles.js'),
  async () => import('./create_role.js'),
  async () => import('./create_permission.js'),
  async () => import('./show.js'),
  async () => import('./cache_reset.js'),
  async () => import('./pivot_table.js'),
];
