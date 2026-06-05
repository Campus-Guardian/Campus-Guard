const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');

// Kullanıcı kaydı (BTU doğrulaması sonrası)
exports.register = async (req, res) => {
  try {
    const { student_id, password } = req.body;

    // Öğrenci numarası kontrolü
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('student_id', student_id)
      .single();

    if (existing) {
      return res.status(409).json({ error: 'Bu öğrenci numarası zaten kayıtlı' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const { data: user, error } = await supabase
      .from('users')
      .insert({
        student_id,
        email: `${student_id}@btu.edu.tr`,
        password_hash,
        full_name: student_id,
        role: 'user'
      })
      .select('id, student_id, email, full_name, role')
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

// Giriş (öğrenci numarası + şifre)
exports.login = async (req, res) => {
  try {
    const { student_id, password } = req.body;

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('student_id', student_id)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Öğrenci numarası veya şifre hatalı' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Öğrenci numarası veya şifre hatalı' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Hesap devre dışı' });
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });

    res.json({
      message: 'Giriş başarılı',
      user: { id: user.id, student_id: user.student_id, email: user.email, full_name: user.full_name, role: user.role },
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
