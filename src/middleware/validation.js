const Joi = require('joi');

const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      const errors = error.details.map(d => d.message);
      return res.status(400).json({ error: 'Validasyon hatası', details: errors });
    }
    next();
  };
};

// Auth şemaları
const registerSchema = Joi.object({
  student_id: Joi.string().min(1).required().messages({ 'string.empty': 'Öğrenci numarası gerekli' }),
  password: Joi.string().min(6).required().messages({ 'string.min': 'Şifre en az 6 karakter olmalı' }),
  full_name: Joi.string().min(2).max(255).optional().allow('', null)
});

const loginSchema = Joi.object({
  student_id: Joi.string().min(1).required(),
  password: Joi.string().required()
});

// Dashboard admin giriş şeması (email + password)
const adminLoginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Geçerli bir email adresi giriniz',
    'any.required': 'Email adresi gerekli'
  }),
  password: Joi.string().min(1).required().messages({
    'any.required': 'Şifre gerekli'
  })
});

// Sensör verisi şeması
const sensorDataSchema = Joi.object({
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
  is_emergency: Joi.boolean().optional()
});

const sensorBatchSchema = Joi.object({
  device_id: Joi.string().uuid().required(),
  data: Joi.array().items(Joi.object({
    latitude: Joi.number().min(-90).max(90).allow(null),
    longitude: Joi.number().min(-180).max(180).allow(null),
    noise_level: Joi.number().min(0).max(200).allow(null),
    acceleration_x: Joi.number().allow(null),
    acceleration_y: Joi.number().allow(null),
    acceleration_z: Joi.number().allow(null),
    speed: Joi.number().min(0).allow(null),
    battery_level: Joi.number().min(0).max(100).allow(null),
    network_type: Joi.string().allow(null, ''),
    timestamp: Joi.string().isoDate().allow(null)
  })).min(1).required()
});

// Bölge şeması
const zoneSchema = Joi.object({
  name: Joi.string().min(2).max(255).required(),
  type: Joi.string().valid('normal', 'restricted', 'danger').required(),
  polygon: Joi.array().items(
    Joi.array().items(Joi.number()).length(2)
  ).min(3).required(),
  max_capacity: Joi.number().integer().min(0).default(100),
  color: Joi.string().default('#3b82f6'),
  description: Joi.string().allow(null, '')
});

// Cihaz şeması
const deviceSchema = Joi.object({
  device_name: Joi.string().min(1).max(255).required(),
  device_type: Joi.string().default('smartphone'),
  platform: Joi.string().allow(null, '')
});

module.exports = {
  validate,
  registerSchema,
  loginSchema,
  adminLoginSchema,
  sensorDataSchema,
  sensorBatchSchema,
  zoneSchema,
  deviceSchema
};
