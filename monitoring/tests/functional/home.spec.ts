import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { account } from '#tests/helpers/accounts'

test.group('Home page', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('the site root sends a visitor to the login page', async ({ client }) => {
    const response = await client.get('/').redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })

  test('the site root sends a signed-in user to the dashboard', async ({ client }) => {
    const nurse = await account('nurse')

    const response = await client.get('/').loginAs(nurse).redirects(0)

    response.assertHeader('location', '/dashboard')
  })

  test('the login page sends a signed-in user to the dashboard', async ({ client }) => {
    const nurse = await account('nurse')

    const response = await client.get('/login').loginAs(nurse).redirects(0)

    response.assertHeader('location', '/dashboard')
  })

  test('the login page shows the sign-in form under the name of the application', async ({
    client,
    assert,
  }) => {
    const response = await client.get('/login')

    response.assertTextIncludes('Hospital Monitoring System')
    response.assertTextIncludes('Sign in')
    assert.notInclude(response.text(), 'auth__aside')
  })

  test('renders the system check page', async ({ client }) => {
    const response = await client.get('/system')

    response.assertStatus(200)
    response.assertTextIncludes('Hospital Monitoring System')
    response.assertTextIncludes('SQLite connected')
  })
})
