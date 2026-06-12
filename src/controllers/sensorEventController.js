const sensorService = require('../services/sensorService');

function validateEventAge(event) {
  const measured = new Date(event.measured_at).getTime();
  return Number.isFinite(measured) && measured >= Date.now() - 24 * 60 * 60 * 1000;
}

exports.submitEvent = async (req, res) => {
  if (!validateEventAge(req.body)) {
    return res.status(400).json({ error: 'Olcum zamani son 24 saat icinde olmali' });
  }
  const result = await sensorService.processSensorEvent(req.body);
  res.status(result.duplicate ? 200 : 201).json(result);
};

exports.submitBatch = async (req, res) => {
  const events = req.body.events.map((event) => ({
    ...event,
    device_id: req.body.device_id,
  }));
  if (events.some((event) => !validateEventAge(event))) {
    return res.status(400).json({ error: 'Tum olcumler son 24 saat icinde olmali' });
  }

  const results = [];
  for (const event of events) results.push(await sensorService.processSensorEvent(event));
  res.status(201).json({
    processed: results.length,
    duplicates: results.filter((item) => item.duplicate).length,
    stale: results.filter((item) => item.stale).length,
    alerts: results.reduce((sum, item) => sum + item.alerts.length, 0),
  });
};
