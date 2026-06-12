# CampusGuard — Detaylı Proje Dokümantasyonu ve Mimari Yapısı

CampusGuard, üniversite kampüslerinde (BTÜ Mimar Sinan Yerleşkesi) öğrenci güvenliğini, gürültü kirliliğini, kısıtlı bölge ihlallerini ve acil durumları akıllı telefon sensörlerini kullanarak gerçek zamanlı olarak izleyen, analiz eden ve yöneten kapsamlı bir IoT ve web otomasyon sistemidir.

---

## 📂 Genel Klasör Yapısı (Directory Tree)

```text
Campus-Guard-main/
├── .dockerignore                 # Docker imajı oluşturulurken dışarıda bırakılacak dosyalar
├── .env                          # Backend yerel ortam değişkenleri (Supabase URL, Key, JWT vb.)
├── .env.example                  # Örnek ortam değişkenleri şablonu
├── .gitignore                    # Git versiyon kontrolüne dahil edilmeyecek dosyalar
├── Dockerfile                    # Backend ve static dosyaları çalıştıran Docker imaj tanımı
├── docker-compose.yml            # Docker Compose ile tek komutla ayağa kaldırma yapılandırması
├── package-lock.json             # Backend kilitli npm bağımlılık listesi
├── package.json                  # Backend npm bağımlılık ve script tanımları
├── server.js                     # HTTP ve Socket.io sunucusunu başlatan ana giriş dosyası
│
├── database/                     # Veritabanı yapılandırma dosyaları
│   └── schema.sql                # Supabase PostgreSQL veritabanı tabloları, indeksler ve seed verisi
│
├── src/                          # Backend Uygulama Sunucu Kodları (Node.js/Express)
│   ├── app.js                    # Express konfigürasyonu, CORS, Helmet ve API route bağlantıları
│   ├── config/                   # Sunucu genel yapılandırmaları
│   │   ├── supabase.js           # Supabase DB ve RLS bağlantı istemcisi
│   │   └── zones.js              # Varsayılan kampüs sınırları ve anomali eşik değerleri (Thresholds)
│   ├── controllers/              # API mantığını ve veritabanı sorgularını yöneten denetleyiciler
│   │   ├── alertController.js    # Alarmları listeleme, çözme ve istatistikleri çekme API mantığı
│   │   ├── authController.js     # Kullanıcı kayıt, giriş ve dashboard admin giriş işlemleri
│   │   ├── btuController.js      # BTU öğrenci portalı (CAPTCHA ve Öğrenci No Doğrulama) entegrasyonu
│   │   ├── dashboardController.js# Live-devices feed, heatmap verisi ve zaman serisi grafik dataları
│   │   ├── deviceController.js   # Cihaz ekleme, listeleme, silme ve düzenleme API'leri
│   │   ├── sensorController.js   # Sensör veri paketlerini işleme ve geçmiş verileri çekme denetleyicisi
│   │   ├── simulatorController.js # Simülasör için bulk test kullanıcısı/cihazı üretme ve temizleme
│   │   ├── zoneController.js     # Kampüs bölge (poligon) ekleme, silme ve güncelleme
│   │   └── reportController.js   # Alarmlar ve sensör verilerini CSV olarak indirme, 24 saatlik özet
│   ├── middleware/               # Ara yazılımlar
│   │   ├── auth.js               # JWT doğrulama ve Admin rolü yetkilendirme kontrolü
│   │   ├── errorHandler.js       # Global Express hata yakalama ve formatlama ara yazılımı
│   │   └── validation.js         # İstek gövdelerinin şemalara göre validasyon kontrolü
│   ├── routes/                   # Express uç nokta (endpoint) yönlendirmeleri
│   │   ├── alertRoutes.js
│   │   ├── authRoutes.js
│   │   ├── btuRoutes.js          # BTU doğrulama endpoint'leri (captcha, verify)
│   │   ├── dashboardRoutes.js
│   │   ├── deviceRoutes.js
│   │   ├── sensorRoutes.js
│   │   ├── simulatorRoutes.js     # Bulk simülatör endpoint'leri (generate, cleanup)
│   │   ├── zoneRoutes.js
│   │   └── reportRoutes.js       # CSV dışa aktarma ve raporlama endpoint'leri
│   ├── services/                 # İş mantığı (Business Logic) servisleri
│   │   ├── alertService.js       # Alarm oluşturma, zenginleştirme (öğrenci no) ve Socket ile bildirme
│   │   ├── analysisService.js    # Hız, gürültü, anormal hareket (ivme) ve yasak bölge poligon kontrolü
│   │   ├── sensorService.js      # Gelen sensör verisini kaydetme, analiz etme ve socket.io'ya basma
│   │   └── noiseCorrelationService.js # Bölge bazlı 3 cihazdan 5 ardışık paket gürültü korelasyonu
│   └── socket/                   # WebSockets Real-time haberleşme katmanı
│       └── socketHandler.js      # Socket.io sunucu kurulumu, 'join-dashboard' room yönetimi
│
├── dashboard/                    # Admin Dashboard Ön Yüz Dosyaları (Vanilla JS, HTML5, CSS3)
│   ├── index.html                # Admin Giriş Paneli (Giriş yapmayanları karşılar)
│   ├── dashboard.html            # Canlı harita, son alarmlar ve istatistiklerin izlendiği ana sayfa
│   ├── alerts.html               # Geçmiş ve aktif alarmların filtrelenip çözüldüğü alarm tablosu
│   ├── devices.html              # Cihaz listesi ve Gelişmiş Test Simülatörünün barındığı sayfa
│   ├── zones.html                # Kampüs üzerindeki poligon kısıtlı/tehlikeli bölgelerin çizildiği sayfa
│   ├── css/
│   │   └── style.css             # Ortak renk paleti, grid sistemleri, tablo ve modal css tanımları
│   └── js/
│       ├── auth.js               # İstemci tarafı oturum kontrolü (cg_token, cg_user) ve login istekleri
│       ├── socket.js             # İstemci Socket.io bağlantısı ve gerçek zamanlı arayüz yenileme tetikleyicileri
│       ├── dashboard.js          # Dashboard istatistikleri yükleme, son alarmlar ve CSV indirme tetikleme
│       ├── alerts.js             # Alarm tablosu verilerini filtreli çekme ve alarm çözme istekleri
│       ├── devices.js            # Cihaz tablosu listeleme, Tekli/Toplu simülasyon yönetimi ve API çağrıları
│       ├── map.js                # Leaflet.js harita çizimi, marker alarm renklendirmesi, bölge rengi geri dönüşü
│       ├── zones.js              # Poligon bölge çizimi (Leaflet Draw) ve veritabanına kaydetme / silme
│       └── charts.js             # Ortalama gürültü ve hız zaman serisi grafikleri (Chart.js)
│
├── mobile/                       # PWA (Aşamalı Web Uygulaması) Mobil İstemci Dosyaları (Vanilla JS, HTML5, CSS)
│   ├── index.html                # Mobil giriş, BTU doğrulaması ve sensör izleme tek sayfa arayüzü
│   ├── manifest.json             # PWA manifest dosyası (uygulama adı, ikonlar, renkler)
│   ├── sw.js                     # Servis işçisi (Service Worker) önbellekleme mekanizması
│   ├── css/
│   │   └── style.css             # Mobil uyumlu responsive stil kodları
│   └── js/
│       ├── api.js                # Sunucu API istekleri için yardımcı sarmalayıcı (mApi)
│       ├── auth.js               # PWA Giriş, BTU Captcha çekme/doğrulama ve Kayıt kodları
│       └── sensors.js            # Web sensörleri (GPS, İvmeölçer, Mikrofon Web Audio dB) okuma ve gönderme
│
└── mobile-app/                   # Mobil Uygulama Dosyaları (React Native / Expo)
    ├── App.js                    # Ana uygulama navigasyon yönlendirmesi
    ├── app.json                  # Expo yapılandırma dosyası (ikonlar, splash vb.)
    ├── package.json              # Expo bağımlılıkları ve çalıştırma scriptleri
    └── src/
        ├── components/           # Tekrar kullanılabilir arayüz öğeleri (Button, Input, Alert vb.)
        ├── config/
        │   └── theme.js          # Mobil uygulamanın renk, radius, spacing ve yazı boyutu tanımları
        ├── screens/
        │   ├── LoginScreen.js    # Responsive düzeltmeleri yapılan mobil giriş ekranı
        │   ├── RegisterScreen.js # BTU portal entegrasyonlu CAPTCHA içeren yeni üye kayıt ekranı
        │   └── AppScreen.js      # Sensör verilerinin okunup sunucuya gönderildiği mobil dashboard
        └── services/
            ├── apiService.js     # API isteklerini sarmalayan ve JWT ekleyen servis
            ├── authService.js    # Mobil oturum açma / kayıt olma servis entegrasyonu
            └── sensorService.js  # GPS (25m gate ve EMA), ivmeölçer, mikrofon (dB) native donanım okuyucu
```

---

## 🛠️ Her Dosya ve Klasörün Ayrıntılı Açıklaması

### 1. Root Yapılandırma Dosyaları
*   **[Dockerfile](./Dockerfile):** Node.js 20 Alpine tabanlı hafif bir Linux imajı kurar. `package.json` dosyalarını kopyalayıp sadece production bağımlılıklarını yükler. Tüm backend ve dashboard statik dosyalarını içine alarak sunucuyu başlatmaya hazır hale getirir.
*   **[docker-compose.yml](./docker-compose.yml):** `campusguard-app` adında bir container tanımlar. Sunucu portunu dış dünyaya `3000` portundan bağlar. Supabase URL ve anahtarları gibi kritik ortam değişkenlerini enjekte eder.
*   **[.dockerignore](./.dockerignore):** Docker imajına gönderilmesi gerekmeyen `node_modules`, `mobile-app` (mobil kodlar), `.git` ve diğer geliştirme dosyalarını dışarıda tutarak derleme süresini kısaltır.
*   **[server.js](./server.js):** Express uygulamasını bir HTTP sunucusu olarak sarar, Socket.io kütüphanesini bu sunucuya bağlar ve yapılandırılan porttan (varsayılan 3000) dinlemeye başlar.

---

### 2. Database (Veritabanı Şeması)
*   **[database/schema.sql](./database/schema.sql):** Supabase PostgreSQL veritabanında çalıştırılacak tabloları içerir:
    *   `users`: Kullanıcıların bilgileri, şifre hashleri ve rolleri (`admin`/`user`).
    *   `devices`: Kullanıcıların üzerine kayıtlı IoT/akıllı cihazlar, en son görüldükleri enlem/boylam ve tarih bilgileri.
    *   `sensor_data`: Cihazlardan saniyede bir veya 5 saniyede bir akan zaman serisi verileri (gürültü, ivme, hız, batarya).
    *   `zones`: Kampüste tanımlanan poligon koordinatlı (geofence) bölgeler.
    *   `alerts`: Sistem tarafından tespit edilen gürültü, hız ihlali, yasaklı bölge girişi ve hareket anomalilerinin loglandığı alarmlar tablosu.
    *   `crowd_density`: Bölgelerdeki anlık insan yoğunluğunu ve kapasite oranlarını tutan tablo.

---

### 3. Backend Uygulama Mantığı (`src/`)

#### Controllers (API Denetleyicileri)
*   **[src/controllers/authController.js](./src/controllers/authController.js):** Öğrencilerin BTU uzantılı e-postaları ile mobil uygulamaya kaydolmasını ve giriş yapmasını sağlar. Dashboard üzerinde ise admin yetkisi olan hesapların (`adminLogin`) token (JWT) almasını yönetir.
*   **[src/controllers/btuController.js](./src/controllers/btuController.js):** BTU Akıllı Kart/Öğrenci İşleri portalı (`https://akillikart.btu.edu.tr:446`) ile entegrasyon sağlar. Giriş için gerekli CAPTCHA görselini çekip base64 formatında istemciye sunar ve öğrenci numarası ile güvenlik kodunu BTU web sitesine post ederek öğrenci kimliğini doğrular.
*   **[src/controllers/deviceController.js](./src/controllers/deviceController.js):** İstemcilerin yeni cihaz kaydetmesini ve yönetmesini sağlar. Admin kullanıcılar için veritabanındaki kullanıcı verilerini join yaparak cihazın hangi öğrenci numarasına (`student_id`) ait olduğunu tespit eder.
*   **[src/controllers/sensorController.js](./src/controllers/sensorController.js):** Mobil uygulamadan veya test simülatöründen gelen tekli (`submitData`) ve toplu (`submitBatch`) sensör verilerini alır, veri işleme kuyruğuna (sensorService) aktarır. Cihaz geçmiş verilerini listeler.
*   **[src/controllers/alertController.js](./src/controllers/alertController.js):** Sistemdeki aktif ve çözülmüş alarmları filtreleyerek getirir. Bir alarmın admin tarafından "çözüldü" olarak işaretlenmesini yönetir.
*   **[src/controllers/zoneController.js](./src/controllers/zoneController.js):** Kampüs haritası üzerinde oluşturulan alanları veritabanına kaydeder, günceller veya siler.
*   **[src/controllers/dashboardController.js](./src/controllers/dashboardController.js):** Canlı aktif cihaz sayısını, çözülmemiş alarm durumlarını, haritada gösterilecek heatmap koordinatlarını ve zaman serisi grafik verilerini toplu olarak çeker.
*   **[src/controllers/simulatorController.js](./src/controllers/simulatorController.js):**
    *   `generateTestData`: Admin panelinden tek tıklamayla belirtilen adette (örn: 15 adet) `TESTxxxxx` öğrenci numarasına sahip hayali öğrenci ve cihaz ataması yapar. Cihazları BTÜ sınırları içinde rastgele konumlara yerleştirir.
    *   `cleanupTestData`: Testlerin ardından veritabanındaki `TEST` ile başlayan tüm hayali öğrencileri, ilişkili cihazları, sensör geçmişlerini ve alarmlar cascade olarak veritabanından tamamen temizler.
*   **[src/controllers/reportController.js](./src/controllers/reportController.js):**
    *   `getAlertsCSV` & `getSensorsCSV`: Alarmları ve sensör verilerini tarih aralığı filtreleriyle alıp CSV string'e dönüştürür. Excel'in Türkçe karakterleri düzgün açabilmesi için **UTF-8 BOM (\uFEFF)** ön ekiyle istemciye indirilebilir dosya halinde gönderir.
    *   `getHourlySummary`: Son 24 saatlik veriyi saatlik dilimlere bölerek her saat için ortalama desibel değerini, aktif cihaz sayısını ve o saatte patlayan alarm sayısını JSON istatistiği olarak derler.

#### Routes (API Yönlendiriciler)
*   **[src/routes/authRoutes.js](./src/routes/authRoutes.js):** `/api/auth/register`, `/api/auth/login` ve `/api/auth/admin-login` endpoint'leri.
*   **[src/routes/sensorRoutes.js](./src/routes/sensorRoutes.js):** `/api/sensors/submit` ve `/api/sensors/history` vb. endpoint'ler.
*   **[src/routes/alertRoutes.js](./src/routes/alertRoutes.js):** `/api/alerts`, `/api/alerts/:id/resolve` vb. endpoint'ler.
*   **[src/routes/deviceRoutes.js](./src/routes/deviceRoutes.js):** `/api/devices` (ekleme, silme, listeleme) endpoint'ler.
*   **[src/routes/zoneRoutes.js](./src/routes/zoneRoutes.js):** `/api/zones` (bölge oluşturma, silme, listeleme) endpoint'ler.
*   **[src/routes/dashboardRoutes.js](./src/routes/dashboardRoutes.js):** `/api/dashboard/stats` ve `/api/dashboard/heatmap` vb. endpoint'ler.
*   **[src/routes/btuRoutes.js](./src/routes/btuRoutes.js):** `/api/btu/captcha` ve `/api/btu/verify` öğrenci doğrulama endpoint'leri.
*   **[src/routes/simulatorRoutes.js](./src/routes/simulatorRoutes.js):** `/api/simulator/generate` ve `/api/simulator/cleanup` endpoint'leri.
*   **[src/routes/reportRoutes.js](./src/routes/reportRoutes.js):** `/api/reports/alerts/csv` ve `/api/reports/sensors/csv` endpoint'leri.

#### Services (İş Mantığı ve Anomali Motoru)
*   **[src/services/sensorService.js](./src/services/sensorService.js):** Cihazlardan gelen her veride ivme büyüklüğünü (`acceleration_magnitude`) hesaplar, sensör verilerini `sensor_data` tablosuna yazar, cihazın `last_seen` ve `last_latitude/longitude` alanlarını günceller, anomali motorunu çalıştırır ve socket.io üzerinden haritaya anlık konum verisini (`sensor-update`) fırlatır.
*   **[src/services/analysisService.js](./src/services/analysisService.js):** Sensör verilerinde anomali tespiti yapan temel motordur:
    *   `analyzeNoise`: Gürültü seviyesi 70 dB'i aşarsa uyarı, 85 dB'i aşarsa kritik alarm nesnesi oluşturur.
    *   `analyzeMotion`: Cihaz ivmesi eşiği (20 m/s²) aşarsa anormal sarsıntı/kaza alarmı üretir.
    *   `analyzeSpeed`: Kampüs sınırındaki hız limiti (30 km/s) aşılırsa hız ihlali alarmı üretir.
    *   `analyzeZoneProximity`: Point-in-Polygon ray-casting algoritması ile cihaz konumunun kısıtlı (`restricted`) veya tehlikeli (`danger`) poligon sınırları içinde kalıp kalmadığını kontrol eder.
*   **[src/services/alertService.js](./src/services/alertService.js):** Tespit edilen anomalilerin veritabanına `alerts` tablosuna kaydedilmesini yönetir. Kayıt sırasında alarmı tetikleyen cihazın sahibi olan öğrenci bilgisini çekip details alanına ekler. Socket üzerinden dashboard'a `new-alert` yayını yapar. Aynı tipteki aktif çözülmemiş alarmların mükerrer eklenmesini önleyen spam engelleme mantığına sahiptir.
*   **[src/services/noiseCorrelationService.js](./src/services/noiseCorrelationService.js):**
    *   Bölge bazlı gürültü analizlerini in-memory buffer kullanarak korelasyonlu hale getirir.
    *   Bir poligon bölge içinde en az **3 farklı cihazdan** her biri için **5 ardışık** yüksek desibel paketi (>=70 dB) geldiğinde, o bölgeye özel olarak `noise_critical` türünde genel bir alarm tetikler.
    *   Tetikleme sonrası o bölgenin sayaçlarını sıfırlar ve 60 saniyelik anti-spam filtresi uygular.

---

### 4. Admin Dashboard Ön Yüzü (`dashboard/`)

*   **[dashboard/index.html](./dashboard/index.html):** Yönetici giriş ekranıdır. `admin@campusguard.com` gibi admin rollü hesaplar dışındaki girişleri yetkisiz kabul eder.
*   **[dashboard/dashboard.html](./dashboard/dashboard.html):** Giriş yapıldıktan sonra açılan ana yönetim ekranıdır. Sağ üst köşede canlı alarm bildirim zili ve **"📥 CSV Raporu"** butonu yer alır. Canlı BTÜ haritasını, anlık istatistik kartlarını, son 10 aktif alarmı ve gürültü/hız trend grafiklerini barındırır.
*   **[dashboard/alerts.html](./dashboard/alerts.html):** Alarmların listelendiği gelişmiş tablodur. Alarm Tipi, Önem Seviyesi ve Çözülme Durumuna göre filtreleme araçlarına sahiptir. Alarmı tetikleyen cihaz adı ve Öğrenci No alanlarını gösterir.
*   **[dashboard/devices.html](./dashboard/devices.html):** Kampüsteki kayıtlı cihazları ve sahiplerini listeler. Sağ üstte yer alan "Test Verisi Gönder" butonuyla **BTÜ Gelişmiş Test Simülatörü** modalını açar.
*   **[dashboard/zones.html](./dashboard/zones.html):** Leaflet Draw kütüphanesini kullanarak BTÜ haritası üzerinde serbest çizimle normal, kısıtlı ve tehlikeli alanlar çizilmesini ve bu alanların veritabanına kaydedilmesini sağlar.

#### JS Dosyaları (`dashboard/js/`)
*   **[dashboard/js/auth.js](./dashboard/js/auth.js):** Tarayıcı yerel hafızasındaki `cg_token` (JWT) ve `cg_user` bilgilerini yönetir. Giriş yetkilerini denetler, logout fonksiyonunu çalıştırır ve tüm API isteklerine Bearer token'ı enjekte eden ortak `apiRequest` istemci fonksiyonunu barındırır.
*   **[dashboard/js/socket.js](./dashboard/js/socket.js):** Sunucu ile WebSocket bağlantısı kurar. Sunucudan yayılan `new-alert` ve `sensor-update` olaylarını dinleyerek haritadaki markerları günceller ve alarm sayaçlarını anlık olarak artırır.
*   **[dashboard/js/dashboard.js](./dashboard/js/dashboard.js):** Dashboard istatistiklerini yükler. Üstteki "📥 CSV Raporu" butonunun tıklama olayını yakalayıp Bearer token ile `/api/reports/alerts/csv` endpoint'ine istek atarak indirme (Blob) işlemini başlatır.
*   **[dashboard/js/map.js](./dashboard/js/map.js):**
    *   Leaflet haritası üzerinde poligon bölgeleri ve cihaz konumlarını circleMarker olarak çizer.
    *   Aktif alarmlı cihazları önem derecesine göre **mavi (normal)**, **sarı (orta ihlal)**, **turuncu (gürültü ihlali)** ve **kırmızı (kritik ihlal)** renkte marker ile gösterir.
    *   **Bölge Rengi Geri Dönüşü (Bölüm 6):** Socket üzerinden yasaklı veya tehlikeli bölge alarmı geldiğinde o bölgenin poligonunu kırmızıya boyar. `sensor-update` ile akan her sensör paketinde alarmı olmayan bölgelerin sayacını artırır. 5 paket boyunca o bölgede yeni alarm tetiklenmezse, poligon rengini veritabanındaki orijinal rengine (mavi/turuncu/kırmızı vb.) geri döndürür.
*   **[dashboard/js/devices.js](./dashboard/js/devices.js):**
    *   **BTÜ Gelişmiş Test Simülatörü** mantığını yönetir.
    *   **Tek Cihaz Simülasyonu:** Seçilen bir cihaz için haritadan başlangıç konumu tıklanıp sensör değerleri (dB, hız, ivme) sliders ile ayarlandıktan sonra aralık ve paket adedi belirlenerek başlatılır. "Simüle Hareket (Yürüme)" seçilirse, cihaz her pakette harita sınırları içinde rastgele küçük adımlarla (lat/lng +- 0.00018) gezinir.
    *   **Toplu (Bulk) Simülasyon:** `simulator/generate` ve `simulator/cleanup` servislerini tetikler. Oluşturulan 10-20 hayali öğrencinin toplu olarak veri göndermesini başlatır. Preset modları sayesinde (Gezinen, Gürültülü Grup, Hız Yapanlar, Yasak Bölgeye Koşanlar) arka uç servislerinin performans testleri ve anomali doğrulukları test edilebilir. Yasak bölgeye koşan cihazlar, haritadaki tehlikeli poligonun merkezine doğru her adımda %15 yaklaşacak şekilde hareket eder.
    *   **Simülasyon Paneli:** Çalışan simülatörleri saniye saniye izleyen, durduran ve yöneten alt paneli günceller.
*   **[dashboard/js/zones.js](./dashboard/js/zones.js):** Leaflet Draw kullanarak harita üzerinde poligonlar (bölgeler) çizilmesini, bunların adlandırılmasını, tiplerinin (normal, restricted, danger) ve kapasitelerinin belirlenerek veritabanına kaydedilmesini ya da silinmesini yönetir.
*   **[dashboard/js/charts.js](./dashboard/js/charts.js):** Chart.js entegrasyonu ile zaman serisi bazında ortalama hız ve gürültü trend grafiklerini çizer ve günceller.

---

### 5. Mobil Uygulama (`mobile-app/`)

*   **[mobile-app/src/screens/LoginScreen.js](./mobile-app/src/screens/LoginScreen.js):** 
    *   Öğrenci numarası ve şifre ile giriş ekranıdır.
    *   `Dimensions` API'si entegre edilerek ekran genişliği 440px'den küçük cihazlarda kart genişliğinin `%100` kaplaması, tabletlerde ise ortalanmış sabit genişlik alması sağlandı. Metinlerin butonlarda veya başlıklarda kırpılmaması için ölçeklenebilir yazı tipi ayarları yapıldı.
*   **[mobile-app/src/screens/RegisterScreen.js](./mobile-app/src/screens/RegisterScreen.js):** Yeni öğrenci kayıt ekranıdır. BTU portal entegrasyonu sayesinde öğrenci numarasını doğrulatmak üzere CAPTCHA gösterir ve doğrulama sonrasında şifre belirleterek kayıt işlemini tamamlar.
*   **[mobile-app/src/screens/AppScreen.js](./mobile-app/src/screens/AppScreen.js):** Cihaz kaydı yaptıktan sonra GPS (konum, hız), ivmeölçer (hareket anomalileri) ve mikrofon (gürültü desibeli) verilerini toplayarak sunucuya WebSocket üzerinden gerçek zamanlı olarak gönderen ve durumu kullanıcıya gösteren mobil arayüzdür.
*   **[mobile-app/src/services/apiService.js](./mobile-app/src/services/apiService.js):** API isteklerini sarmalayan, baseURL yapılandırmasını yöneten ve JWT oturum token'ını otomatik olarak istek başlıklarına (Authorization Bearer) ekleyen yardımcı servistir.
*   **[mobile-app/src/services/authService.js](./mobile-app/src/services/authService.js):** Giriş, kayıt ve token saklama/silme (SecureStore) gibi kimlik doğrulama işlemlerini yürüten servis.
*   **[mobile-app/src/services/sensorService.js](./mobile-app/src/services/sensorService.js):** 
    *   Akıllı telefon donanımlarından verileri Expo API'leri ile okur.
    *   **Hız Filtrelemesi Geliştirmesi:** GPS hata payı (`accuracy`) 25 metrenin üzerindeyse (örn: kapalı alanlar, sınıflar) oluşan sapmaların hızı 30 km/h gibi göstermemesi için hız değeri 0'a kilitlenir.
    *   Doğruluk oranı 30m'nin üzerindeyse GPS verisine daha az güvenen yumuşatma katsayısı (EMA alpha: 0.15), açık alanda yürürken ise daha hızlı tepki veren (EMA alpha: 0.5) smoothing filtresi çalışır.
    *   İvmeölçerden okunan dinamik yerçekimsiz ivme gücü 0.25 m/s²'nin altındaysa cihazın tamamen sabit durduğu anlaşılır ve hız değeri sıfırlanır. Bu sayede kapalı alanda hızın yürüme hızlarında veya dururken sıçrama yapması engellenmiştir.

---

### 6. Mobil PWA İstemcisi (`mobile/`)
PWA (Progressive Web App) mimarisi sayesinde, telefona herhangi bir uygulama indirmeden tarayıcı üzerinden doğrudan cihaz sensörlerine erişmeyi ve konum/gürültü/ivme verilerini sunucuya iletmeyi sağlar.

*   **[mobile/index.html](./mobile/index.html):** Mobil PWA arayüzünün tek sayfa (SPA) yapısıdır. Giriş, BTU Öğrenci Doğrulama, şifre belirleme ve sensör izleme paneli ekranları arasında dinamik geçişleri yönetir.
*   **[mobile/manifest.json](./mobile/manifest.json):** Uygulamanın ismini, tema rengini ve telefon ekranında bir uygulama gibi kısayol olarak eklenmesini sağlayan manifest dosyasıdır.
*   **[mobile/sw.js](./mobile/sw.js):** Çevrimdışı desteği ve hızlı yükleme amacıyla statik dosyaları önbelleğe alan Service Worker dosyası.
*   **[mobile/js/api.js](./mobile/js/api.js):** Sunucu API endpoint'lerine yapılan HTTP isteklerini yöneten, Authorization Bearer token'ı enjekte eden sarmalayıcı fonksiyondur.
*   **[mobile/js/auth.js](./mobile/js/auth.js):** PWA üzerindeki giriş, BTU CAPTCHA çekme, öğrenci no doğrulama ve kayıt tamamlama iş mantığını yöneten JS dosyası.
*   **[mobile/js/sensors.js](./mobile/js/sensors.js):** Tarayıcının donanım API'lerini (`navigator.geolocation`, `DeviceMotionEvent` ve Web Audio API/AudioContext mikrofon seviyesi okuyucu) kullanarak 5 saniyede bir veri paketi üreten ve soket/HTTP üzerinden backend'e fırlatan sensör yöneticisidir.

> [!NOTE]
> Mobil PWA istemcisine local sunucu çalışırken `http://localhost:3000/mobile` adresinden erişebilirsiniz. Mobil donanım sensörlerinin (GPS, mikrofon) tarayıcı tarafından güvenli kabul edilip çalışabilmesi için uygulamanın HTTPS üzerinden (örn: Render.com deployment veya HTTPS lokal proxy) sunulması gerekmektedir.

---

## 🛠️ Nasıl Çalıştırılır (Local ve Docker)

### 1. Docker ile Başlatma (Tavsiye Edilen)
Proje kök dizininde terminali açıp aşağıdaki komutu çalıştırmanız yeterlidir:
```bash
docker-compose up --build
```
Bu komut, tüm backend ve dashboard statik dosyalarını tek bir container içinde ayağa kaldıracaktır. Tarayıcınızdan `http://localhost:3000/dashboard` adresine giderek yönetim paneline erişebilirsiniz.

### 2. Yerel Sunucuyu Başlatma (Local Run)
Backend bağımlılıklarını kurup sunucuyu başlatmak için:
```bash
# Bağımlılıkları yükleyin
npm install

# Yerel sunucuyu başlatın
npm start
```

### 3. Mobil Uygulamayı Başlatma (Expo)
Mobil uygulamayı yerel simülatörde veya Expo Go uygulamasında çalıştırmak için:
```bash
cd mobile-app
npm install
npx expo start --clear
```
Terminalde oluşan QR kodu telefonunuzdaki Expo Go uygulamasından taratarak mobil uygulamayı canlı test edebilirsiniz.
