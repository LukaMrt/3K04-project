import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import User from '#models/user'
import { account } from '#tests/helpers/accounts'

test.group('Dashboard / authentication and permissions (FR-USR-01, SPEC-USR-01)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('the dashboard is never shown without authentication', async ({ client }) => {
    const response = await client.get('/dashboard').redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })

  test('a role without the function gets the permission message (D-14)', async ({ client }) => {
    const nurse = await account('nurse')

    const response = await client.get('/accounts').loginAs(nurse)

    response.assertStatus(403)
    response.assertTextIncludes('Your role does not give access to this function')
  })

  test('a deactivated account is logged out at its next request (D-25)', async ({ client }) => {
    const nurse = await account('nurse', { active: false })

    const response = await client.get('/dashboard').loginAs(nurse).redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })

  test('a deactivated account is refused at login (FR-USR-05)', async ({ client }) => {
    const nurse = await account('nurse', { active: false })

    const response = await client
      .post('/login')
      .form({ email: nurse.email, password: 'test-password' })
      .withCsrfToken()
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
    response.assertFlashMessage('error', 'This account has been deactivated.')
  })
})

test.group('Dashboard / accounts (FR-USR-03 to 05, NFR-AUD-04)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('an administrator creates an account with one role', async ({ client, assert }) => {
    const admin = await account('administrator')

    const response = await client
      .post('/accounts')
      .form({
        fullName: 'Ada Nurse',
        email: 'ada@hospital.test',
        password: 'long-enough',
        role: 'nurse',
      })
      .withCsrfToken()
      .loginAs(admin)
      .redirects(0)

    response.assertStatus(302)
    const created = await User.findByOrFail('email', 'ada@hospital.test')
    assert.equal(created.role, 'nurse')
    assert.isTrue(created.active)
  })

  test('an email already used is refused', async ({ client }) => {
    const admin = await account('administrator')
    const nurse = await account('nurse')

    const response = await client
      .post('/accounts')
      .form({ fullName: 'Copy', email: nurse.email, password: 'long-enough', role: 'nurse' })
      .withCsrfToken()
      .loginAs(admin)
      .redirects(0)

    response.assertFlashMessage('error', `An account already uses ${nurse.email}`)
  })

  test('a role change applies from the next login only (FR-USR-04)', async ({ client, assert }) => {
    const admin = await account('administrator')
    const nurse = await account('nurse')

    await client
      .post(`/accounts/${nurse.id}/role`)
      .form({ role: 'administrator' })
      .withCsrfToken()
      .loginAs(admin)

    await nurse.refresh()
    assert.equal(nurse.role, 'administrator')
    // An open session keeps the role read at its login.
    const stillNurse = await client.get('/accounts').loginAs(nurse).withSession({ role: 'nurse' })
    stillNurse.assertStatus(403)
  })

  test('an administrator deactivates an account', async ({ client, assert }) => {
    const admin = await account('administrator')
    const nurse = await account('nurse')

    await client.post(`/accounts/${nurse.id}/deactivate`).withCsrfToken().loginAs(admin)

    await nurse.refresh()
    assert.isFalse(nurse.active)
  })
})
