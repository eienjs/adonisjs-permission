# @eienjs/adonisjs-permission

[![Source Code][badge-source]][source]
[![Npm Node Version Support][badge-node-version]][node-version]
[![Latest Version][badge-release]][release]
[![Software License][badge-license]][license]
[![Build Status][badge-build]][build]
[![Total Downloads][badge-downloads]][downloads]

> Associate users with roles and permissions

## Introduction

This package allows you to manage user permissions and roles in a database. Inspired by `Laravel Permission` by Spatie.

## Quick Start

Install the package using ace command

```bash
node ace add @eienjs/adonisjs-permission
```

## Usage

### 1. Configure Models

Compose your models using the provided mixins:

```ts
// app/models/user.ts
import { compose } from '@adonisjs/core/helpers';
import { BaseModel } from '@adonisjs/lucid/orm';
import { HasAuthorizable } from '@eienjs/adonisjs-permission';

export default class User extends compose(BaseModel, HasAuthorizable) {
  // your user columns...
}
```

```ts
// app/models/role.ts
import { compose } from '@adonisjs/core/helpers';
import { BaseModel, column } from '@adonisjs/lucid/orm';
import { Roleable } from '@eienjs/adonisjs-permission';

export default class Role extends compose(BaseModel, Roleable) {
  @column({ isPrimary: true })
  declare id: number | string;
}
```

```ts
// app/models/permission.ts
import { compose } from '@adonisjs/core/helpers';
import { BaseModel, column } from '@adonisjs/lucid/orm';
import { Permissible } from '@eienjs/adonisjs-permission';

export default class Permission extends compose(BaseModel, Permissible) {
  @column({ isPrimary: true })
  declare id: number | string;
}
```

### 2. Working with Roles and Permissions

#### Assign and Check Roles

```ts
// Assign role(s) to a user
await user.assignRole('writer');
await user.assignRole('writer', 'editor');

// Remove role(s)
await user.revokeRole('writer');

// Sync roles (replaces existing assignments)
await user.syncRoles('admin');

// Check roles
await user.hasRole('writer'); // boolean
await user.hasAnyRole('admin', 'editor'); // boolean
await user.hasAllRoles('admin', 'editor'); // boolean
```

#### Assign and Check Permissions

```ts
// Direct permissions on user
await user.givePermissionTo('edit articles');
await user.givePermissionTo('edit articles', 'publish articles');

// Revoke permission(s)
await user.revokePermissionTo('edit articles');

// Sync permissions
await user.syncPermissions('view articles');

// Check permission (checks both direct permissions and permissions via roles)
await user.can('edit articles'); // or user.hasPermissionTo('edit articles')
await user.hasAnyPermission('edit articles', 'delete articles');
await user.hasAllPermissions('view articles', 'edit articles');
```

#### Roles with Permissions

```ts
import Role from '#models/role';

const role = await Role.findOrCreate({ name: 'editor' });

// Attach permissions to a role
await role.givePermissionTo('edit articles', 'publish articles');

// Check if role has permission
await role.hasPermissionTo('edit articles');

// Sync permissions on role
await role.syncPermissions('view articles', 'edit articles');
```

### 3. Route Middlewares

Protect your routes using the built-in named middlewares:

```ts
import router from '@adonisjs/core/services/router';
import { middleware } from '#start/kernel';

// Role protection
router.get('/dashboard', [DashboardController, 'index'])
  .use(middleware.role({ roles: ['admin', 'manager'] }));

// Permission protection
router.post('/posts', [PostsController, 'store'])
  .use(middleware.permission({ permissions: ['create posts'] }));

// Either role OR permission
router.get('/reports', [ReportsController, 'index'])
  .use(middleware.roleOrPermission({ roleOrPermission: ['admin', 'view reports'] }));
```

### 4. Teams / Multi-Tenancy (Optional)

When `teams: true` is enabled in your configuration:

```ts
// Scope role assignment and permission checks to a specific team
// Or execute actions within an AsyncLocalStorage team scope
import { runWithTeam } from '@eienjs/adonisjs-permission';

await user.forTeam(teamId).assignRole('admin');
await user.forTeam(teamId).can('manage billing');

await runWithTeam(teamId, async () => {
  await user.can('manage billing');
});
```

## Documentation

The documentation is available on [EienJS](https://eienjs.com/packages/adonisjs-permission/getting-started/).

## Contributing

Contributions are welcome. Please read [CONTRIBUTING][] for more details and remember to check the [CHANGELOG][] file.

## Copyright and License

The `@eienjs/adonisjs-permission` library is licensed for use under the MIT License (MIT). Please see [LICENSE][] for more information.

[contributing]: https://github.com/eienjs/.github/blob/main/docs/CONTRIBUTING.md
[changelog]: https://github.com/eienjs/adonisjs-permission/blob/main/CHANGELOG.md
[source]: https://github.com/eienjs/adonisjs-permission
[node-version]: https://www.npmjs.com/package/@eienjs/adonisjs-permission
[release]: https://www.npmjs.com/package/@eienjs/adonisjs-permission
[license]: https://github.com/eienjs/adonisjs-permission/blob/main/LICENSE
[build]: https://github.com/eienjs/adonisjs-permission/actions/workflows/build.yml?query=branch:main
[downloads]: https://www.npmjs.com/package/@eienjs/adonisjs-permission
[badge-source]: https://img.shields.io/badge/source-eienjs/adonisjs--permission-blue.svg?logo=github
[badge-node-version]: https://img.shields.io/node/v/@eienjs/adonisjs-permission.svg?logo=nodedotjs
[badge-release]: https://img.shields.io/npm/v/@eienjs/adonisjs-permission.svg?logo=npm
[badge-license]: https://img.shields.io/github/license/eienjs/adonisjs-permission?logo=open-source-initiative
[badge-build]: https://img.shields.io/github/actions/workflow/status/eienjs/adonisjs-permission/build.yml?branch=main
[badge-downloads]: https://img.shields.io/npm/dm/@eienjs/adonisjs-permission.svg?logo=npm
