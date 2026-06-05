const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');

// Kullanıcı kaydı
exports.register = async (req, res) => {
  try {
    const { email, password, full_name } = req.body;

    // Email kontrolü
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existing) {
      return res.status(409).json({ error: 'Bu email zaten kayıtlı' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const { data: user, error } = await supabase
      .from('users')
      .insert({ email, password_hash, full_name, role: 'user' })
      .select('id, email, full_name, role')
      .single();

    if (error) throw error;

    const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });

    res.status(201).json({ message: 'Kayıt başarılı', user, token });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Kayıt sırasında hata oluştu' });
  }
};

// Giriş
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Email veya şifre hatalı' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Email veya şifre hatalı' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Hesap devre dışı' });
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });

    res.json({
      message: 'Giriş başarılı',
      user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role },
      token
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Giriş sırasında hata oluştu' });
  }
};

// Profil bilgisi
exports.getMe = async (req, res) => {
  res.json({ user: req.user });
};
