/*
|--------------------------------------------------------------------------
| Live channel
|--------------------------------------------------------------------------
|
| Starts the live channel of the Operator Dashboard once the application is
| ready (D-27). Preloaded in the "web" environment only.
|
*/

import app from '@adonisjs/core/services/app'
import LiveChannel from '#modules/dashboard/live_channel'

app.ready(async () => {
  const liveChannel = await app.container.make(LiveChannel)
  liveChannel.start()
})
