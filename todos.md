🔧 Yapman Gerekenler (Sırasıyla)
Supabase SQL Şemasını Çalıştır → Supabase SQL Editor'e database/schema.sql içeriğini yapıştır ve çalıştır
Lokalde Test Et → node server.js çalıştır, tarayıcıda localhost:3000/dashboard aç, admin giriş: admin@campusguard.com / admin123
Render'a Deploy Et → GitHub'a push, Render'da root directory: CampusGuardV1, env vars ekle
Bölge Tanımla → Admin panelden BTÜ Mimar Sinan kampüsünde polygon çizerek bölgeler tanımla
Mobil Test → Telefondan https://YOUR-URL.onrender.com/mobile aç, sensörleri başlat
📱 Mobil Tarafta Ne Yapman Gerekiyor?
Hiçbir uygulama kurulumu gerekmez! PWA olarak çalışıyor:

Telefon tarayıcısında deploy URL'inin /mobile yoluna git
Giriş yap → Cihaz kaydet → Sensörleri Başlat
GPS, mikrofon, ivmeölçer izinlerini ver
Her 5 saniyede veri otomatik gönderilir, dashboard'dan canlı takip edilir
⚠️ Not: Mikrofon ve GPS için HTTPS gerekli. Render'da otomatik HTTPS olacak, lokalde bu sensörler çalışmayabilir.