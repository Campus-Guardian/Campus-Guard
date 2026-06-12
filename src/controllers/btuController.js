const axios = require('axios');
const https = require('https');
const crypto = require('crypto');
const { createRegistrationTicket } = require('../services/tokenService');

const httpsAgent = new https.Agent({ rejectUnauthorized: true });

const BTU_BASE = 'https://akillikart.btu.edu.tr:446';

// Session bilgilerini bellekte sakla (sessionId -> cookies)
const sessionStore = new Map();

// Session temizleme (5 dk sonra sil)
function cleanupSession(sessionId) {
  setTimeout(() => {
    sessionStore.delete(sessionId);
  }, 5 * 60 * 1000);
}

// İsim maskeleme: "Ahmet Çimen" → "A**** Ç****"
function maskName(name) {
  if (!name) return '';
  return name.split(' ').map(part => {
    if (part.length <= 1) return part;
    return part.charAt(0) + '*'.repeat(part.length - 1);
  }).join(' ');
}

// BTU'dan CAPTCHA görselini çek
exports.getCaptcha = async (req, res) => {
  try {
    // Önce login sayfasına git, cookie al
    const pageRes = await axios.get(`${BTU_BASE}/User/Login`, {
      httpsAgent,
      maxRedirects: 5,
      withCredentials: true
    });

    // Cookie'leri topla
    const setCookies = pageRes.headers['set-cookie'] || [];
    const cookieString = setCookies.map(c => c.split(';')[0]).join('; ');

    // __RequestVerificationToken'ı HTML'den çek
    const html = pageRes.data;
    const tokenMatch = html.match(/name="__RequestVerificationToken"\s+type="hidden"\s+value="([^"]+)"/);
    const verificationToken = tokenMatch ? tokenMatch[1] : '';

    // CAPTCHA görselini çek
    const captchaUrl = `${BTU_BASE}/Captcha/CaptchaImage?I=${Math.random()}`;
    const captchaRes = await axios.get(captchaUrl, {
      httpsAgent,
      responseType: 'arraybuffer',
      headers: {
        'Cookie': cookieString,
        'Referer': `${BTU_BASE}/User/Login`
      }
    });

    // Captcha sonrası yeni cookie'leri de ekle
    const captchaCookies = captchaRes.headers['set-cookie'] || [];
    const allCookies = setCookies.concat(captchaCookies);
    const fullCookieString = allCookies.map(c => c.split(';')[0]).join('; ');

    // Base64'e çevir
    const captchaBase64 = Buffer.from(captchaRes.data).toString('base64');
    const captchaDataUrl = `data:image/png;base64,${captchaBase64}`;

    // Session ID oluştur
    const sessionId = crypto.randomUUID();
    sessionStore.set(sessionId, {
      cookies: fullCookieString,
      verificationToken,
      createdAt: Date.now()
    });
    cleanupSession(sessionId);

    res.json({
      sessionId,
      captchaImage: captchaDataUrl
    });

  } catch (err) {
    console.error('BTU Captcha hatası:', err.message);
    res.status(500).json({ error: 'CAPTCHA alınırken hata oluştu' });
  }
};

// BTU'ya login isteği at (öğrenci doğrulama)
exports.verifyStudent = async (req, res) => {
  try {
    const { sessionId, sicilNo, captcha } = req.body;

    if (!sessionId || !sicilNo || !captcha) {
      return res.status(400).json({ error: 'Tüm alanlar zorunludur' });
    }

    // Session bilgisini al
    const session = sessionStore.get(sessionId);
    if (!session) {
      return res.status(400).json({ error: 'Oturum süresi dolmuş, CAPTCHA\'yı yenileyin' });
    }

    // BTU'ya login isteği at
    const formData = new URLSearchParams();
    formData.append('__RequestVerificationToken', session.verificationToken);
    formData.append('LOGIN_FIELD', 'SICILNO');
    formData.append('SICILNO', sicilNo);
    formData.append('CAPTCHA', captcha);

    const loginRes = await axios.post(`${BTU_BASE}/User/LoginControl`, formData.toString(), {
      httpsAgent,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': session.cookies,
        'Referer': `${BTU_BASE}/User/Login`,
        'Origin': BTU_BASE,
        'X-Requested-With': 'XMLHttpRequest'
      },
      maxRedirects: 0,
      validateStatus: (status) => status < 500
    });

    const result = loginRes.data;

    // BTU yanıtını kontrol et
    if (result && result.Err === '') {
      // Login başarılı — login sonrası cookie'leri güncelle
      const postLoginCookies = loginRes.headers['set-cookie'] || [];
      const updatedCookies = postLoginCookies.length > 0
        ? [...session.cookies.split('; '), ...postLoginCookies.map(c => c.split(';')[0])].join('; ')
        : session.cookies;

      // Kullanıcı bilgilerini almak için ana sayfaya git
      let nameHint = '';
      try {
        const homeRes = await axios.get(`${BTU_BASE}/Home/Index`, {
          httpsAgent,
          headers: {
            'Cookie': updatedCookies,
            'Referer': `${BTU_BASE}/User/Login`
          },
          maxRedirects: 5,
          validateStatus: (status) => status < 500
        });

        const homeHtml = homeRes.data;

        // Kullanıcı adını HTML'den çek
        // Pattern 1: navbar'daki text-decoration-none span
        let nameMatch = homeHtml.match(/class="text-decoration-none"[^>]*>([^<]+)/i);
        
        if (!nameMatch) {
          // Pattern 2: Hoşgeldiniz, AD SOYAD
          nameMatch = homeHtml.match(/Hoşgeldin[^,]*,\s*([^<\n]+)/i);
        }
        if (!nameMatch) {
          // Pattern 3: dropdown veya navbar'daki isim
          nameMatch = homeHtml.match(/class="[^"]*user[_-]?name[^"]*"[^>]*>([^<]+)/i);
        }

        if (nameMatch && nameMatch[1]) {
          // &nbsp; gibi HTML karakterlerini normal boşluğa çevir
          nameHint = nameMatch[1].replace(/&nbsp;/ig, ' ').trim();
        }
      } catch (homeErr) {
        console.error('BTU ana sayfa hatası:', homeErr.message);
      }

      // Session'ı temizle
      sessionStore.delete(sessionId);

      const registrationTicket = await createRegistrationTicket(sicilNo, nameHint);
      return res.json({
        verified: true,
        message: 'Öğrenci numarası doğrulandı',
        nameHint: nameHint || '',
        registrationTicket
      });
    } else {
      // Session'ı temizle
      sessionStore.delete(sessionId);

      // Doğrulama başarısız
      return res.json({
        verified: false,
        message: result?.Err || 'Doğrulama başarısız. Öğrenci numaranızı ve CAPTCHA\'yı kontrol edin.'
      });
    }

  } catch (err) {
    console.error('BTU doğrulama hatası:', err.message);
    res.status(500).json({ error: 'Doğrulama sırasında hata oluştu' });
  }
};
