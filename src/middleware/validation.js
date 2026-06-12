const Joi = require('joi');

const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });
  if (error) {
    return res.status(400).json({
      error: 'Validasyon hatasi',
      details: error.details.map((detail) => detail.message),
    });
  }
  req.body = value;
  next();
};

const registerSchema = Joi.object({
  student_id: Joi.string().min(1).max(255).required(),
  password: Joi.string().min(8).max(128).required(),
  registration_ticket: Joi.string().min(32).required(),
});

const loginSchema = Joi.object({
  student_id: Joi.string().min(1).max(255).required(),
  password: Joi.string().max(128).required(),
});

const adminLoginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().max(128).required(),
});

const refreshSchema = Joi.object({
  refresh_token: Joi.string().min(32).required(),
});

const sensorEventFields = {
  event_id: Joi.string().uuid().required(),
  device_id: Joi.string().uuid().required(),
  measured_at: Joi.string().isoDate().required(),
  app_state: Joi.string().valid('foreground', 'background', 'inactive').default('foreground'),
  latitude: Joi.number().min(-90).max(90).allow(null),
  longitude: Joi.number().min(-180).max(180).allow(null),
  location_accuracy: Joi.number().min(0).max(10000).allow(null),
  speed: Joi.number().min(0).max(500).allow(null),
  noise_level: Joi.number().min(0).max(200).allow(null),
  noise_peak: Joi.number().min(0).max(200).allow(null),
  acceleration_x: Joi.number().min(-200).max(200).allow(null),
  acceleration_y: Joi.number().min(-200).max(200).allow(null),
  acceleration_z: Joi.number().min(-200).max(200).allow(null),
  acceleration_magnitude: Joi.number().min(0).max(400).allow(null),
  battery_level: Joi.number().min(0).max(100).allow(null),
  network_type: Joi.string().max(50).allow(null, ''),
  sample_quality: Joi.object().unknown(true).default({}),
  is_emergency: Joi.boolean().default(false),
};

const sensorEventSchema = Joi.object(sensorEventFields);
const sensorEventWithoutDeviceSchema = Joi.object({
  ...sensorEventFields,
  device_id: Joi.forbidden(),
});

const sensorEventBatchSchema = Joi.object({
  device_id: Joi.string().uuid().required(),
  events: Joi.array().items(sensorEventWithoutDeviceSchema).min(1).max(100).required(),
});

const legacySensorDataSchema = Joi.object({
  device_id: Joi.string().uuid().required(),
  latitude: Joi.number().min(-90).max(90).allow(null),
  longitude: Joi.number().min(-180).max(180).allow(null),
  noise_level: Joi.number().min(0).max(200).allow(null),
  acceleration_x: Joi.number().allow(null),
  acceleration_y: Joi.number().allow(null),
  acceleration_z: Joi.number().allow(null),
  speed: Joi.number().min(0).allow(null),
  battery_level: Joi.number().min(0).max(100).allow(null),
  network_type: Joi.string().allow(null, ''),
  timestamp: Joi.string().isoDate().allow(null),
  is_emergency: Joi.boolean().optional(),
});

const sensorBatchSchema = Joi.object({
  device_id: Joi.string().uuid().required(),
  data: Joi.array().items(legacySensorDataSchema.fork(['device_id'], (field) => field.forbidden()))
    .min(1)
    .max(100)
    .required(),
});

const zoneSchema = Joi.object({
  name: Joi.string().min(2).max(255).required(),
  type: Joi.string().valid('normal', 'restricted', 'danger').required(),
  polygon: Joi.array().items(
    Joi.array().ordered(
      Joi.number().min(-90).max(90).required(),
      Joi.number().min(-180).max(180).required()
    )
  ).min(3).required(),
  max_capacity: Joi.number().integer().min(0).default(100),
  color: Joi.string().pattern(/^#[0-9a-fA-F]{6}$/).default('#3b82f6'),
  description: Joi.string().max(1000).allow(null, ''),
});

const zoneUpdateSchema = zoneSchema.fork(
  ['name', 'type', 'polygon'],
  (field) => field.optional()
).min(1);

const deviceSchema = Joi.object({
  device_name: Joi.string().min(1).max(255).required(),
  device_type: Joi.string().max(100).default('smartphone'),
  platform: Joi.string().max(50).allow(null, ''),
  student_id: Joi.string().min(1).max(255).optional(),
});

const deviceUpdateSchema = Joi.object({
  device_name: Joi.string().min(1).max(255),
  is_active: Joi.boolean(),
}).min(1);

const analysisSettingsSchema = Joi.object({
  noise_threshold_db: Joi.number().min(40).max(130),
  noise_min_devices: Joi.number().integer().min(2).max(100),
  noise_window_seconds: Joi.number().integer().min(5).max(600),
  noise_min_readings: Joi.number().integer().min(1).max(20),
  noise_cooldown_seconds: Joi.number().integer().min(10).max(3600),
  noise_resolve_seconds: Joi.number().integer().min(10).max(3600),
  max_location_accuracy_m: Joi.number().min(5).max(200),
  zone_confirmation_count: Joi.number().integer().min(1).max(10),
  zone_confirmation_window_seconds: Joi.number().integer().min(5).max(120),
  speed_limit_kmh: Joi.number().min(5).max(150),
  raw_retention_days: Joi.number().integer().min(1).max(365),
  summary_retention_days: Joi.number().integer().min(7).max(3650),
}).min(1);

const pushTokenSchema = Joi.object({
  expo_push_token: Joi.string().pattern(/^ExponentPushToken\[[^\]]+\]$|^ExpoPushToken\[[^\]]+\]$/).required(),
  device_id: Joi.string().uuid().allow(null),
  platform: Joi.string().valid('android', 'ios').required(),
});

module.exports = {
  validate,
  registerSchema,
  loginSchema,
  adminLoginSchema,
  refreshSchema,
  sensorEventSchema,
  sensorEventBatchSchema,
  sensorDataSchema: legacySensorDataSchema,
  sensorBatchSchema,
  zoneSchema,
  zoneUpdateSchema,
  deviceSchema,
  deviceUpdateSchema,
  analysisSettingsSchema,
  pushTokenSchema,
};
