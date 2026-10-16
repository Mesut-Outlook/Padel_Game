# Görev agy-01 Raporu: Padel Oyun Mekanikleri Araştırması ve Karakter Asset Rehberi

**Ajan:** Antigravity (agy / Gemini)  
**Tarih:** 16 Ekim 2026  
**Durum:** Tamamlandı  
**Hedef:** Claude Opus koordinasyonunda Three.js tabanlı Padel oyunu için mekanik, kural, 3D asset ve animasyon kılavuzu.

---

## 1. Padel Video Oyunlarının Oynanış Mekaniklerinin Özeti

Piyasada ve Steam/Mobil mağazalarda yer alan öne çıkan padel oyunlarının mekanik analizleri ve tasarım fikirleri:

### A. Red Bull Padel: Court Legends (Mobil - iOS / Android)
- **Kontrol Şeması:** Sadeleştirilmiş dokunmatik ve hareket (gesture) kontrolleri. Oyuncu kortta çifti kontrol eder; dokunulan yere en yakın oyuncu otomatik hareket eder.
- **Vuruş Sistemi (Swipe Mekaniği):**
  - **Uzun / Yavaş Kaydırma (Swipe):** Yüksek ve savunma odaklı vuruşlar (Globo / Lob).
  - **Kısa / Hızlı Kaydırma:** Hücum vuruşları, düz sert vuruşlar (Drive) ve smaçlar.
- **Zamanlama & Aim:** Top oyuncunun vurma menziline girdiğinde ekranda bir hedef dairesi belirmekte; zamanlama çemberi ne kadar iyi yakalanırsa vuruş hassasiyeti o kadar artmaktadır.
- **Kamera:** İzometrik / yarı kuşbakışı üçüncü şahıs açısı. Çift oyuncu koordinasyonunu görmeyi kolaylaştırır.
- **Kariyer / İlerleme:** Karakter ekipmanları, raket özellikleri (güç, kontrol, falso) ve kort açılışları.

### B. Padel Rivals (PC - Steam)
- **Tasarım Felsefesi:** Arcade-rekabetçi hibrit. Özellikle cam duvar fiziklerini oyunun merkezine koyar.
- **Kontroller & Vuruş Türleri:**
  - Gamepad ve klavye destekli. Sol analog hareket, sağ analog/tetikler vuruş tipi seçimi.
  - Bandeja, víbora ve contrapared (kendi camına çarptırarak topu rakibe atma) özel tuş kombinasyonlarıyla gerçekleştirilir.
- **Kamera:** Karakterin arkasından takip eden dinamik üçüncü şahıs (over-the-shoulder / chase cam) ve servis anlarında geniş kort görünümüne geçiş.
- **Multiplayer:** 4 oyunculu yerel ve çevrimiçi çok oyunculu maçlar, karakter özelleştirme.

### C. Padel Pro World Tour (PC / Konsol)
- **Tasarım Felsefesi:** Hızlı tempolu arcade spor simülasyonu, uluslararası turnuvalar ve Dünya Kupası modu.
- **Zamanlama & Şut Göstergesi:** Güç çubuğu (power bar) ve yeşil alan "sweet spot" zamanlama barı.
- **Kamera & Replay:** Sayı sonrası şık smaçlarda ve duvar vuruşlarında otomatik "slow-motion" sinematik replay kamerası.

### D. Simply Padel (PC - Steam)
- **Tasarım Felsefesi:** Gerçekçi taktik simülasyon (solo geliştirici projesi).
- **Mekanikler:** Rakibin pozisyonunu okuyup "chiquita" (ayak ucuna yumuşak bırakma) veya derin "globo" ile file hakimiyetini alma stratejisi.
- **Online Modlar:** Elo tabanlı dereceli eşleşme, 20'den fazla kort tipi.

**Three.js Projemiz İçin Tasarım Fikirleri:**
1. **İki Modlu Nişan Alma (Aim):** Hareket tuşları (WASD) hareket ederken, vuruş anında basılı tutulan yön tuşu topun korttaki iniş hedefini belirlemeli.
2. **Kamera:** Dinamik takip kamerası (Takım 0 için `z > 0` arkasından bakan hafif açılı perspektif, `lookAt(kort merkezi)`).
3. **Duvar Algılama Uyarısı:** Top cama doğru giderken oyuncunun arkasındaki cama sekip sekmediğini gösteren görsel zemin projeksiyonu.

---

## 2. Gerçek Padel Kuralları ve FIP / Premier Padel Standartları

### A. FIP Kort ve Ekipman Ölçüleri
- **Kort Ölçüleri:** 20.0 m uzunluk × 10.0 m genişlik (içten içe, ±%0.5 tolerans).
- **File:** Uzunluk 10 m; ortada yükseklik **0.88 m**, yan direklerde maksimum **0.92 m**.
- **Servis Çizgisi:** Fileden her iki yönde **6.95 m** mesafededir. Orta çizgi bu alanı iki eşit servis kutusuna böler (genişlik 5.0 m).
- **Duvarlar:** Arka duvar toplam **4.0 m** yüksekliğindedir (alttan 3.0 m şeffaf cam veya kagir, üst 1.0 m metal tel örgü / mesh). Yan duvarlar basamaklı veya düz kombinasyonlu cam ve tel örgüden oluşur.
- **Top Ölçüleri ve Ağırlığı:** Çap **6.35 - 6.77 cm**, ağırlık **56.0 - 59.4 g**.
- **Top Sekme Testi:** 2.54 m yükseklikten sert ve düz bir zemine serbest bırakılan topun, ilk sekmede **135 cm ile 145 cm** arasına yükselmesi zorunludur.

### B. Skor Kuralları: Avantaj vs. Golden Point vs. Star Point
1. **Geleneksel Avantaj (Advantage):** 40-40 durumunda üst üste 2 sayı alan oyunu kazanır.
2. **Golden Point (Punto de Oro / No-Ad):** 40-40 olduğunda doğrudan tek bir karar sayısı oynanır. Karşılayan takım servisin hangi taraftan (sağ veya sol) atılacağını seçer. Sayıyı alan oyunu kazanır. (Premier Padel ve FIP turnuvalarında maç süresi ve yayın optimizasyonu için standartlaştırılmıştır).
3. **Star Point (FIP Hibrit Kuralı):** 40-40'tan sonra ilk avantaj oynanır. Eğer avantajı alan takım sayıyı alamazsa tekrar 40-40 olur ve bu kez ani ölüm (sudden-death) "Star Point" uygulanır.

### C. Servis Kuralları
- Servis daima bel hizasının veya altında vurulmalıdır (underhand).
- Servis atan oyuncu servis çizgisi arkasında durmalı, topu önce kendi zeminine sektirmeli, ardından zıplayan topa vurmalıdır.
- Top çapraz rakip servis kutusuna düşmelidir.
- Servis kutusuna düştükten sonra tel örgüye (mesh) çarparsa **hata (fault)** sayılır. Cama çarparsa oyun devam eder.
- Fileye çarpıp doğru servis kutusuna düşerse "Let" olur ve servis tekrarlanır; tel örgüye değerse faul olur.

### D. Cam ve Tel Örgü Kuralları
- Top doğrudan rakip duvara/tele çarparsa dışarı (out) sayılır.
- Top önce zemine sekip ardından arka cama çarparsa oyun sürer.
- Top zemine sekip tele çarparsa (rallide) oyun sürer; ancak serviste tele çarparsa fauldür.
- **Contrapared (Kendi camını kullanma):** Oyuncu topu kendi arka camına vurarak rakip sahaya aşırtabilir; ancak kendi yan teline vuramaz.

### E. Vuruş Türleri Kılavuzu
| Vuruş | Açıklama | Taktik Amaç |
|---|---|---|
| **Bandeja** | Baş üstünden dilimleme (slice) vuruş, yumuşak | File pozisyonunu kaybetmeden topu derinde ve alçakta tutmak |
| **Víbora** | Yandan kesme, falso ve hız odaklı agresif vuruş | Camdan sonra topun köşede yatay ve düzensiz sekmesini sağlamak |
| **Rulo** | Üstten falsolu (topspin) kafese/tele doğru vurulan şut | Rakibin zamanını çalmak, fileden uzaklaştırmak |
| **Smash Por Tres (x3)** | Topu rakip camdan sektirip 3 metrelik yan duvardan kort dışına fırlatma | Doğrudan sayı kazandıran bitirici hücum |
| **Smash Por Cuatro (x4)** | Topu sertçe zeminden sektererek 4 metrelik arka duvardan kort dışına fırlatma | Geri dönüşü imkansız şut |
| **Chiquita** | Rakibin ayak dibine yumuşak, alçak bırakma | Filedeki rakibi alttan top kaldırmaya zorlayıp hücum şansı yaratmak |
| **Globo (Lob)** | Yüksek ve derin aşırtma vuruş | Fileyi savunmadan devralmak için en temel padel vuruşu |
| **Contrapared** | Kendi arka camına çarptırarak arkadan öne atılan savunma vuruşu | Sıkışılan zor pozisyonda topu oyunda tutmak |
| **Bajada (de pared)** | Camdan yüksek seken topu file seviyesinde sert hücumla indirme | Savunmadan anında hücuma geçiş vuruşu |

---

## 3. Ücretsiz ve Lisanslı 3D Modeller & Animasyon Kılavuzu

### A. Model Kaynakları ve Lisanslar
1. **Mixamo (Adobe)**:
   - **Lisans:** Ücretsiz, ticari oyunlarda kullanım izni vardır (Royalty-free).
   - **Kısıtlama:** Ham FBX/model dosyaları bağımsız varlık (asset paketi) olarak yeniden satılamaz/dağıtılamaz; oyun içine gömülü (Three.js GLB build) olmalıdır. ML eğitimi yasaktır.
   - **Hazır Karakterler:** Xbot, Michelle, Soldier vb. (Erkek/Kadın).
   - **İskelet:** Evrensel standart `mixamorig`.
2. **MakeHuman / MPFB (MakeHuman Plugin for Blender)**:
   - **Lisans:** **CC0 (Public Domain)**. Tamamen telifsiz ve ticari serbestlik.
   - **İçerik:** Gerçekçi erkek ve kadın sporcu modelleri parametrik üretilebilir.
   - **Mixamo Uyumu:** MPFB içinde "Reduced Doll" veya Mixamo iskelet önayarı seçilerek doğrudan Mixamo'ya aktarılabilir.
   - **GLB Dönüşümü:** Blender -> File -> Export -> glTF 2.0 (.glb).
3. **Quaternius**:
   - **Lisans:** **CC0 (Public Domain)**.
   - **İçerik:** Stylized ve low-poly sporcu modelleri, rigging hazır.
   - **Link:** [quaternius.com](https://quaternius.com) / itch.io.
4. **Ready Player Me (RPM)**:
   - **Lisans:** Ücretsiz geliştirici entegrasyonu, Three.js ile doğrudan GLB desteği.
   - **Uyumluluk:** Mixamo animasyonları Blender üzerinden veya Three.js `SkeletonUtils` ile retarget edilebilir.

### B. Mixamo'dan İndirilecek Animasyonlar ve Padel Karşılıkları
Mixamo kütüphanesinde doğrudan "Tennis" anahtar kelimesiyle kayıt bulunmamaktadır. Padel vuruşları için Mixamo'daki atletik, beyzbol, golf ve yakın dövüş animasyonları kusursuz şekilde eşleştirilebilir:

| Padel Hareketi | Mixamo Animasyon Adı | İndirme Ayarı | Not / Kullanım |
|---|---|---|---|
| **Bekleme Duruşu** | `Tennis Idle` veya `Fighting Idle` / `Athletic Idle` | In Place | Ayaklar omuz genişliğinde yaylanır |
| **Servis** | `Golf Drive` veya `Overhand Throw` | In Place | Padel servisi bel hizasında olduğu için overhand yerine alttan savurma veya modifiye swing |
| **Forehand Drive** | `Baseball Bunt Swing` / `Golf Swing` / `Sword Slash` | In Place | Yatay raket salınımı |
| **Backhand Drive** | `Backhand Slash` / `Standing Melee Attack 360` | In Place | Tek el veya çift el ters vuruş |
| **Bandeja / Víbora** | `Overhand Smash` / `Overhand Melee Strike` | In Place | Baş hizasında hafif kesme hareket |
| **Smash (x3/x4)** | `Jump Smash` / `High Strike` | In Place | Zıplayarak tepe noktada bitirici darbe |
| **Globo (Lob) / Chiquita**| `Underhand Toss` / `Low Strike` | In Place | Alttan yukarı raket çıkarma |
| **Koşma (İleri)** | `Jog Forward` / `Standard Run` | In Place: **AÇIK** | Three.js pozisyonunu engine günceller |
| **Koşma (Geri)** | `Jog Backward` / `Run Backward` | In Place: **AÇIK** | Savunmaya çekilirken |
| **Strafe (Sol)** | `Strafe Left` / `Run Left` | In Place: **AÇIK** | Yan adımlarla kortu kapatma |
| **Strafe (Sağ)** | `Strafe Right` / `Run Right` | In Place: **AÇIK** | Yan adımlarla kortu kapatma |
| **Kutlama / Sayı Sevinci** | `Cheering` / `Fist Pump` | In Place | Sayı kazanıldığında |
| **Hata / Hayal Kırıklığı** | `Disappointment` / `Head Shake` | In Place | Hata yapıldığında |

*Önemli İpucu:* Tüm hareketli animasyonları indirirken Mixamo panelindeki **"In Place"** kutucuğu işaretlenmelidir. Yer değiştirme (displacement) kodu Three.js fizik motoru (`physics.js`) tarafından yönetilmelidir.

---

## 4. Opus İçin Öneriler (Top 10 Madde)

1. **Top-Duvar Çarpışmasında Sürtünme ve Enerji Kaybı:** Cam (`restitution: 0.85`, düşük sürtünme) ile tel örgü (`restitution: 0.40`, yüksek sürtünme ve yön sapması) fizik parametreleri `physics.js` içinde net ayrıştırılmalı.
2. **Kendi Camına Vurma (Contrapared) Desteği:** `rules.js` ve vuruş mekaniği, oyuncunun topu kendi arka camına doğru vurup topun karşı sahaya geçmesine olanak tanımalı; bu padel'in en karakteristik taktik hamlesidir.
3. **Servis İniş Noktası Kontrolü:** Servis atılırken topun önce doğru servis kutusu zeminine basması (`serviceBox`), ardından asla tele temas etmemesi kuralı test suite'e sıkıca eklenmeli.
4. **Sweet-Spot & Falso (Spin) Çarpanı:** Vuruş girdisinde tuşa basılı tutma süresi yerine, topun oyuncu eksenine olan mesafesi ve vuruş anındaki zamanlama penceresine göre slice (kesme) veya topspin açısal hızı verilmeli.
5. **Kamera Perspektifi:** Sabit kuşbakışı yerine, oyuncuyu arkasından takip eden ancak karşı kortu ve camları net gösteren geniş açılı dinamik üçüncü şahıs kamera tercih edilmeli (`fov: 60-65`).
6. **"In Place" Animasyon Entegrasyonu:** GLB karakterlerine yüklenen koşma/strafe animasyonları daima "in-place" olmalı; hareket doğrudan hız vektörleriyle Three.js tarafından hesaplanmalı.
7. **Raket Bağlantı Noktası (Socketing):** Karakter eline raket eklenirken `mixamorig:RightHand` kemiği bulunup, raket mesh'i bu kemiğin alt elemanı (child) olarak eklenmeli.
8. **Yapay Zeka (AI Partner & Rakip) Pozisyonlanması:** Çiftler halinde oynandığı için AI partner, oyuncu fileye çıktığında geride açık alanı kapatmalı veya tandem hareket etmeli.
9. **Golden Point Varsayılanı:** Hızlı ve akıcı oyun deneyimi için 40-40 eşitliğinde standart olarak Golden Point (Punto de Oro) uygulanması oyuncu bağlılığını artırır.
10. **Görsel Duvar Hedef Göstergesi:** Yeni oyuncuların camdan seken topların yönünü tahmin edebilmesi için zemine hafif şeffaf bir sekme izi veya yay yörünge çizgisi (trajectory arc) çizdirilmelidir.

---
*Rapor `agents/reports/agy-01-research.md` dosyasına kaydedilmiştir.*
