import vine from '@vinejs/vine'
import { ROLES } from '#modules/dashboard/presentation'

/** FR-USR-03: an account with one role. */
export const createAccountValidator = vine.create({
  fullName: vine.string().trim().minLength(1).maxLength(128),
  email: vine.string().trim().email().maxLength(254),
  password: vine.string().minLength(8).maxLength(64),
  role: vine.enum(ROLES),
})

/** FR-USR-04 */
export const changeRoleValidator = vine.create({
  role: vine.enum(ROLES),
})
