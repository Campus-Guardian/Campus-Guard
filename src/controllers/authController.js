const bcrypt = require('bcryptjs');
const supabase = require('../config/supabase');
const {
  createAccessToken,
  setAccessCookie,
  clearAccessCookie,
  consumeRegistrationTicket,
  createRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
} = require('../services/tokenService');

function publicUser(user) {
  return {
    id: user.id,
    student_id: user.student_id,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
  };
}

async function findUser(column, value) {
  const { data } = await supabase.from('users').select('*').eq(column, value).maybeSingle();
  return data;
}

async function verifyCredentials(user, password) {
  if (!user || !user.is_active) return false;
  return bcrypt.compare(password, user.password_hash);
}

async function issueMobileSession(user) {
  return {
    access_token: createAccessToken(user),
    refresh_token: await createRefreshToken(user.id),
    expires_in: 900,
  };
}

exports.register = async (req, res) => {
  try {
    const { student_id, password, registration_ticket } = req.body;
    const ticket = await consumeRegistrationTicket(registration_ticket, student_id);
    if (!ticket) {
      return res.status(403).json({ error: 'Gecerli bir BTU dogrulama bileti gerekli' });
    }

    if (await findUser('student_id', student_id)) {
      return res.status(409).json({ error: 'Bu ogrenci numarasi zaten kayitli' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .insert({
        student_id,
        email: `${student_id}@btu.edu.tr`,
        password_hash: await bcrypt.hash(password, 12),
        full_name: ticket.name_hint || student_id,
        role: 'user',
      })
      .select('id, student_id, email, full_name, role')
      .single();

    if (error) throw error;
    res.status(201).json({ message: 'Kayit basarili', user });
  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({ error: 'Kayit sirasinda hata olustu' });
  }
};

exports.login = async (req, res) => {
  try {
    const user = await findUser('student_id', req.body.student_id);
    if (!(await verifyCredentials(user, req.body.password))) {
      return res.status(401).json({ error: 'Ogrenci numarasi veya sifre hatali' });
    }

    res.json({
      message: 'Giris basarili',
      user: publicUser(user),
      ...(await issueMobileSession(user)),
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Giris sirasinda hata olustu' });
  }
};

exports.adminLogin = async (req, res) => {
  try {
    const user = await findUser('email', req.body.email);
    if (!(await verifyCredentials(user, req.body.password))) {
      return res.status(401).json({ error: 'Email veya sifre hatali' });
    }
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Bu panel yalnizca yoneticilere aciktir' });
    }

    setAccessCookie(res, createAccessToken(user));
    res.json({ message: 'Giris basarili', user: publicUser(user) });
  } catch (err) {
    console.error('Admin login error:', err.message);
    res.status(500).json({ error: 'Giris sirasinda hata olustu' });
  }
};

exports.refresh = async (req, res) => {
  try {
    const rotated = await rotateRefreshToken(req.body.refresh_token);
    if (!rotated) return res.status(401).json({ error: 'Gecersiz yenileme tokeni' });

    const user = await findUser('id', rotated.userId);
    if (!user || !user.is_active) return res.status(401).json({ error: 'Hesap kullanilamiyor' });

    res.json({
      access_token: createAccessToken(user),
      refresh_token: rotated.refreshToken,
      expires_in: 900,
      user: publicUser(user),
    });
  } catch (err) {
    console.error('Refresh error:', err.message);
    res.status(500).json({ error: 'Oturum yenilenemedi' });
  }
};

exports.logout = async (req, res) => {
  await revokeRefreshToken(req.body?.refresh_token);
  clearAccessCookie(res);
  res.status(204).end();
};

exports.getMe = async (req, res) => {
  res.json({ user: req.user });
};
