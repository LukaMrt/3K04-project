/**
 * User Management / Auth — module interface.
 *
 * Responsibility: accounts, roles, and permission decisions.
 *
 * Secret (anticipated change): the role → permission mapping.
 *
 * Authentication itself is provided by the starter kit (app/models/user.ts,
 * session controllers, @adonisjs/auth); permissions will use @adonisjs/bouncer
 * (app/abilities, app/policies).
 */
export default class UserService {}
