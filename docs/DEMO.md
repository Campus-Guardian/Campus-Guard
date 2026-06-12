# CampusGuard V1 demo

## Zone entry

1. Sign in to the admin panel and draw a `danger` polygon.
2. Sign in on the Expo development build and start sensors.
3. Enter the polygon with GPS accuracy at or below 25 m.
4. After two locations within 15 seconds, verify one active alarm, a red
   persistent polygon, and a push/local notification on the affected phone.
5. Leave the polygon and provide two accurate outside locations.
6. Verify that the alarm resolves and the polygon returns to its configured
   color.

## Correlated noise

1. Keep defaults: 85 dB, 3 devices, 30 seconds, 2 readings/device.
2. Send two high readings from two devices. Verify no alarm.
3. Send two high readings from a third device within the same window.
4. Verify one `noise_critical` alarm for the polygon and no student push.
5. Stop high readings for 60 seconds and verify automatic resolution.
6. Restart the backend during the scenario and verify counters remain in the
   database.

## Offline delivery

1. Start collection, disable network access, and wait for several events.
2. Confirm the SQLite queue grows.
3. Restore network access and confirm a batch upload drains the queue.
4. Replay an existing `event_id` and verify that no second sensor row or alarm
   is created.

## Privacy

Inspect network requests and application storage. Payloads may contain
`noise_level` and `noise_peak`, but never an audio URI, file, blob, or raw audio
sample. Recorder files are created only in cache and deleted after each chunk.
