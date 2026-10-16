import { test } from '@japa/runner'

test.group('Home page', () => {
  test('renders the system check page', async ({ client }) => {
    const response = await client.get('/')

    response.assertStatus(200)
    response.assertTextIncludes('Hospital Monitoring System')
    response.assertTextIncludes('SQLite connected')
  })
})
