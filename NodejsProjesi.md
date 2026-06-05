def create_md_file():
    content = """# BURSA TEKNİK ÜNİVERSİTESİ
## Bilgisayar Mühendisliği Bölümü

**NODE.JS İLE WEB PROGRAMLAMA**
**Dönem Projesi Föyü**

---

**Proje Başlığı:** Mobil Güvenlik ve Davranış Analizi Platformu
**Ders:** Node.js ile Web Programlama
**Kapsam:** Teknik seçmeli ders dönem projesi
**Kullanım Senaryoları:** Güvenli sürüş, düşme ve hareketsizlik tespiti, kampüs güvenliği, iş sağlığı ve güvenliği

Bu föy, dönem projesinin kapsamını, zorunlu bileşenlerini, önerilen teknoloji yığınını, beklenen teslimleri ve değerlendirme rubriğini içermektedir.

---

### 1. Projenin Amacı
Bu proje kapsamında öğrencilerden, akıllı telefonları birer IoT Edge device olarak kullanarak sensör verisi toplayan, bu verileri Node.js tabanlı bir web server'ına ileten, real-time izleme sağlayan ve temel düzeyde AI / veri analizi ile anomali veya riskli durumları tespit eden bir platform geliştirmeleri beklenmektedir.

Projenin temel amacı, öğrencilerin aşağıdaki alanlarda uygulamalı yetkinlik kazanmasını sağlamaktır:
* Node.js ve Express.js ile backend geliştirme
* RESTful API tasarımı
* Real-time veri akışı yönetimi
* Database tasarımı ve kullanımı
* Authentication ve authorization
* Mobil cihazlardan sensör verisi toplama
* Web tabanlı dashboard geliştirme
* Time series analizi ve temel anomali tespiti
* Ekip çalışması, modüler tasarım ve proje geliştirme disiplini

### 2. Projenin Genel Tanımı
Her ekip, akıllı telefonlardan alınan sensör verilerini kullanarak belirli bir gerçek dünya problemine yönelik çalışan bir Mobil Güvenlik ve Davranış Analizi Platformu geliştirecektir.

Sistem genel olarak aşağıdaki bileşenlerden oluşacaktır:
* **Mobil Client:** Telefonda çalışan, sensör verilerini toplayan uygulama
* **Node.js Backend:** Verileri alan, işleyen, saklayan ve client'lara sunan server tarafı
* **Database:** Sensör kayıtları, kullanıcı bilgileri, cihaz bilgileri ve analiz sonuçlarının saklandığı katman
* **Web Paneli:** Real-time izleme, cihaz yönetimi ve analiz sonuçlarının görüntülendiği arayüz
* **Analiz Modülü:** Time series verisi üzerinde temel anomali / risk tespiti yapan yapı

### 3. Öğrenci Dağılımı ve Kullanım Senaryoları
Dersi alan yaklaşık 60 öğrenci, aşağıda verilen kullanım senaryoları arasında dağıtılacaktır. Her kullanım senaryosu üzerinde yaklaşık 15 öğrenci çalışacaktır. Öğrenciler kendi senaryoları altında ekipler oluşturarak projelerini geliştireceklerdir. Her proje grubu en fazla 4 öğrenciden oluşacaktır. Aynı kullanım senaryosu altında birden fazla proje grubu yer alabilir; dolayısıyla yaklaşık 15 öğrencinin tek bir grup olarak çalışması beklenmemektedir.

**Senaryo 1 - Güvenli Sürüş ve Sürücü Davranışı Analizi**
* Örnek alarm durumları: ani fren tespiti, sert dönüş tespiti, beklenmeyen hızlanma, sarsıntı eşiğinin aşılması, güzergâh dışına çıkma.
* Telefon araç içerisinde bir IoT Node'u gibi kullanılacaktır. Sensör verileri ile sürüş davranışları incelenecek; ani fren, sert dönüş, ani hızlanma ve olağandışı hareketler tespit edilecektir.

**Senaryo 2 - Düşme ve Hareketsizlik Tespiti**
* Örnek alarm durumları: düşme şüphesi, uzun süreli hareketsizlik, olağandışı gece aktivitesi, belirli süre boyunca konum değişmemesi.
* Telefon üzerindeki hareket sensörlerinden yararlanılarak düşme benzeri olaylar veya uzun süreli hareketsizlik durumları tespit edilecektir. Çözüm, özellikle yaşlı bireyler veya yalnız yaşayan kişiler için güvenlik odaklı düşünülebilir.

**Senaryo 3 - Kampüs Güvenliği ve Çevresel Gözlem**
* Örnek alarm durumları: belirli bölgelerde aşırı gürültü, olağandışı kalabalık yoğunluğu, riskli alanlara yaklaşma, beklenmeyen çevresel hareketlilik.
* Telefon üzerinden konum, hareket ve gerektiğinde görüntü / ses verileri toplanarak kampüs içindeki olağandışı durumlar, yoğunluk, gürültü veya riskli alanlar analiz edilecektir.

**Senaryo 4 - İş Sağlığı ve Güvenliği İçin Mobil Risk Algılama**
* Örnek alarm durumları: sert darbe algılanması, düşme şüphesi, tehlikeli bölgeye giriş, uzun süre hareketsiz kalma, yüksek risk puanı oluşması.
* Telefon, saha çalışanı üzerinde taşınan akıllı bir izleme cihazı gibi kullanılacaktır. Sert darbe, düşme, tehlikeli bölgeye giriş, olağandışı hareket veya çevresel risk belirtileri analiz edilecektir.

### 4. Projenin Kapsamı

#### 4.1 Kapsama Dahil Olanlar
* Mobil cihazlardan veri toplama
* Node.js backend geliştirme
* Database yönetimi
* Kullanıcı ve cihaz yönetimi
* Dashboard geliştirme
* Real-time veri akışı
* Time series tabanlı analiz
* Anomali / risk tespiti
* Temel raporlama ve görselleştirme

#### 4.2 Kapsam Dışında Olanlar
* Üretim seviyesinde tam güvenlik sertifikasyonu
* Büyük ölçekli endüstriyel deployment
* İleri seviye deep learning zorunluluğu
* Tam ticari mobil uygulama kalitesinde mağaza yayını
* Profesyonel seviye video işleme altyapısı

> **Not:** Kamera tabanlı analiz yapılabilir; ancak bu zorunlu değildir. Yapıldığı takdirde veri gizliliği ve performans açısından dikkatli ve sınırlı kullanım beklenmektedir.

### 5. Zorunlu Modüller

#### 5.1 Mobil Veri Toplama Modülü
* Akıllı telefondan en az iki farklı sensör verisi toplanmalıdır.
* Sensör örnekleri: ivmeölçer, jiroskop, GPS, mikrofon düzeyi, pil bilgisi, network durumu.
* Toplanan veriler timestamp ile birlikte server'a gönderilmelidir.

#### 5.2 Node.js Backend Modülü
* Node.js tabanlı backend geliştirilmelidir.
* Backend, mobil client'tan gelen verileri kabul etmeli, doğrulamalı ve saklamalıdır.
* RESTful API yapısı kullanılmalıdır.

#### 5.3 Authentication ve Authorization
* Sistemde login işlemi bulunmalıdır.
* En az iki rol tanımlanmalıdır. Örnek: admin ve standart kullanıcı.
* Yetkisiz kullanıcıların belirli kaynaklara erişimi engellenmelidir.

#### 5.4 Database Modülü
* Kullanıcılar, cihazlar, sensör verileri ve alarm / anomali kayıtları Database'de tutulmalıdır.
* Data modeli açık ve anlamlı şekilde tasarlanmalıdır.

#### 5.5 Real-Time İzleme Paneli
* Sensör verileri veya cihaz durumu web paneli üzerinde görüntülenmelidir.
* En az bir sayfada real-time veri güncellemesi bulunmalıdır.
* Grafik veya tablo ile time series gösterimi yapılmalıdır.

#### 5.6 Analiz / Anomali Tespit Modülü
* En az bir adet time series analizi veya anomali tespit yaklaşımı uygulanmalıdır.
* Bu modül basit istatistiksel yöntem, eşik tabanlı yöntem veya temel bir machine learning yaklaşımı içerebilir.

#### 5.7 Alarm / Bildirim Mekanizması
* Sistem riskli ya da olağandışı bir durum tespit ettiğinde bunu panelde göstermelidir.
* Alarm kayıtları listelenebilmelidir.

#### 5.8 Dokümantasyon
* Kurulum adımları, sistem mimarisi, API açıklamaları, data modeli, ekip içi görev dağılımı ve test senaryoları rapor halinde teslim edilmelidir.
* Ayrıca proje raporunda en az şu başlıklar yer almalıdır: Gereksinim analizi, proje tanımı, kullanım senaryosu, sistem mimarisi, data modeli, kullanılan teknolojiler, gerçekleştirilen modüller, test süreci ve karşılaşılan kısıtlar.

### 6. Bonus Özellikler
* Kamera ile olay anı görüntü alma
* Cihaz üzerinde hafif AI analizi
* Harita tabanlı izleme ekranı
* WebSocket ile gelişmiş canlı veri akışı
* Docker ile container tabanlı deployment
* Swagger / OpenAPI entegrasyonu
* Loglama ve hata izleme mekanizması
* Test senaryoları ve otomatik testler
* Rol tabanlı gelişmiş authorization
* Raporlama ve CSV / PDF dışa aktarma
* Raspberry Pi gibi ara bir Edge device ile entegrasyon
* Python mikroservisi ile daha gelişmiş anomali analizi
* Veri sıkıştırma, örnekleme veya enerji verimliliği yaklaşımı
* Mobil client'ta offline data buffering

### 7. Önerilen Teknoloji Yığını

| Katman | Önerilen Teknoloji / Araçlar |
| :--- | :--- |
| **Backend** | Node.js, Express.js veya Fastify |
| **Gerçek zamanlı iletişim** | Socket.io |
| **Database** | MongoDB, PostgreSQL veya MySQL |
| **Authentication** | JWT ve bcrypt |
| **Mobil uygulama** | Flutter, React Native veya Android native (Kotlin / Java) |
| **Web paneli** | React; alternatif olarak basit sunucu tarafı render edilen yapı |
| **Veri görselleştirme** | Chart.js, Recharts veya ApexCharts |
| **Harita tabanlı gösterim** | Leaflet veya Google Maps API |
| **Analiz / AI** | Node.js içinde istatistiksel analiz; ileri düzey için Python + Flask / FastAPI + scikit-learn |
| **Dokümantasyon** | Swagger / OpenAPI, README ve teknik rapor |
| **Deployment ve geliştirme araçları** | Git/GitHub, Postman veya Bruno, isteğe bağlı Docker |

### 8. Geliştirme İlkeleri
Projelerde aşağıdaki ilkelere dikkat edilmesi beklenmektedir:
* Modüler tasarım
* Temiz kod yazımı
* Anlamlı klasör yapısı
* Error handling ve uygun HTTP response'ları
* Data validation
* Gizlilik ve etik farkındalık
* Ekip içi görev paylaşımı
* Düzenli commit geçmişi

Özellikle kamera, mikrofon ve konum gibi hassas veriler kullanıldığında kullanıcı rızası alınmalı, yalnızca gerekli veri toplanmalı, mümkünse anonimleştirme yapılmalı ve gereksiz ham veri saklanmamalıdır.

### 9. Beklenen Teslimler

#### 9.1 Kod Teslimi
* Backend kaynak kodları
* Mobil client kodları
* Web paneli kodları
* Varsa analiz modülü kodları

#### 9.2 Dokümantasyon Teslimi
* Proje raporu (Rapor içinde gereksinim analizi ve proje tanımı bölümleri açıkça yer almalıdır.)
* Kurulum ve çalıştırma kılavuzu
* API dokümantasyonu
* Data modeli açıklaması

#### 9.3 Sunum ve Jüri Değerlendirmesi
* Final sunumu
* Demo senaryosu

Sunumlar, öğretim elemanı ve ders asistanından oluşacak jüri karşısında gerçekleştirilecektir. Ekiplerin projelerini, yatırımcılar heyetine ürününü tanıtan bir start-up yaklaşımıyla; problemin önemi, önerilen çözüm, teknik değer, kullanıcı faydası ve demo akışı çerçevesinde sunmaları beklenmektedir.

#### 9.4 İsteğe Bağlı Ancak Önerilen Ekler
* GitHub repository bağlantısı
* Örnek dataset
* Ekran görüntüleri veya kısa demo videosu

---

### Değerlendirme Rubriği
Aşağıdaki rubrik, dönem projesinin puanlandırılmasında kullanılacaktır. Toplam puan 100'dür. Bonus özellikler, temel gereksinimlerin yerine geçmez; önce zorunlu modüllerin çalışır ve tutarlı biçimde sunulması beklenir.

| Ölçüt | Açıklama | Puan | Değerlendirme Notu |
| :--- | :--- | :--- | :--- |
| **Problem tanımı ve senaryoya uygunluk** | Seçilen kullanım senaryosunun, gereksinim analizinin ve çözüm yaklaşımının açık biçimde tanımlanması; çözümün problem bağlamına uyumu | 10 | |
| **Node.js backend tasarımı ve kod kalitesi** | Sunucu mimarisi, modülerlik, temiz kod, hata yönetimi, uygun HTTP kullanımı | 20 | |
| **API tasarımı ve data validation** | REST uç noktalarının tutarlılığı, istek / yanıt yapıları, validasyon ve güvenlik önlemleri | 10 | |
| **Database tasarımı** | Varlık ilişkileri, şema mantığı, veri saklama yaklaşımı ve sorgulanabilirlik | 10 | |
| **Mobil veri toplama başarısı** | En az iki sensörden veri alma, doğru timestamp ile server'a iletme ve veri bütünlüğü | 10 | |
| **Web paneli ve görselleştirme** | Arayüz işlevselliği, canlı veya geçmiş verilerin anlaşılır sunumu, grafik / tablo kullanımı | 10 | |
| **Real-time yapı** | Canlı veri akışı, durum güncellemeleri ve sistemin real-time davranışı | 10 | |
| **Analiz/anomali tespiti** | Time series analizi veya anomali tespit yaklaşımının doğruluğu ve senaryoya uygunluğu | 10 | |
| **Dokümantasyon ve teslim kalitesi** | Kurulum kılavuzu, teknik rapor, gereksinim analizi, proje tanımı, API dokümantasyonu ve proje düzeni | 5 | |
| **Sunum ve demo başarısı** | Jüri karşısında yapılan sunumun açıklığı, start-up sunumu yaklaşımı, ekip üyelerinin katkısı ve çalışan demo gösterimi | 5 | |

İsteğe bağlı bonus özellikler, öğretim elemanı tarafından ayrı olarak olumlu katkı unsuru şeklinde değerlendirilebilir. Ancak bonuslar, zorunlu modüllerdeki eksikleri telafi etmez.
"""
    
    with open('nodejs_donem_projesi_foyu_guncellenmis.md', 'w', encoding='utf-8') as f:
        f.write(content)

create_md_file()