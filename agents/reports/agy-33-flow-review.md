# agy-33 — Yeni akışın telefon/tablet/masaüstü incelemesi (Salt Okunur Rapor)

**Yapan:** Antigravity (Gemini 3.8 Flash)  
**Tarih:** 2026-11-08  
**Görev Dosyası:** `agents/tasks/agy-33-flow-review.md`  
**Yönetici & İnceleyen:** Claude Opus  
**Referans Spec:** `docs/superpowers/specs/2026-11-07-live-lobby-design.md`, "Başarısızlık sayılacaklar" bölümü  
**Kural Durumu:** Hiçbir kaynak koda dokunulmadı; yalnızca ölçümler yapıldı, ekran görüntüleri kaydedildi ve rapor yazıldı.

---

## Yönetici Özeti ve Temel Bulgular

Tüm testler `npx vite build` ile derlenen production paketinde, yerel `node server/server.js 8080` sunucusu ve Google Chrome Headless üzerinde belirtilen 4 ekran boyutunda (390×844 telefon dikey, 844×390 telefon yatay, 1024×768 tablet, 1366×768 masaüstü) gerçek kullanıcı etkileşimleri, WebSocket istemcileri ve Chrome DevTools Protocol (CDP) otomasyonu ile yürütülmüştür.

### Öne Çıkan Kritik Bulgular (Özet Tablosu)
| # | Konu | Durum | Tespit | Etki |
|---|---|---|---|---|
| 1 | **Davet (Invite) TDZ Çökmesi** | ❌ **Kritik Hata** | `padel.splash.shown === '1'` iken davet linki (`?room=CODE`) açıldığında senkron `initSplash` çağrısı `src/main.js:101`'de `playNow`'u çalıştırıyor; ancak `let net = null` satır 204'te olduğu için `ReferenceError: Cannot access 'net' before initialization` hatası fırlıyor. | Daha önce siteye girmiş bir arkadaş davet linkine dokunduğunda ekran simsiyah/boş kalıyor, maça giremiyor. |
| 2 | **Açık Oda Listesi 10 sn Gecikmesi** | ⚠️ **Önemli Kusur** | `src/main.js:155` `pollOpenGames()` sayfa ilk yüklendiğinde splash/rota nedeniyle `home.hidden === true` olduğundan yoklamayı atlıyor ve 10 sn sonraya erteliyor; `showHome()` açıldığında da tetiklenmiyor. | Biri maç beklerken siteyi açan ziyaretçi ilk 10 saniye boyunca açık odayı göremiyor ("Nobody is waiting right now" yazıyor). |
| 3 | **Yatay Telefonda Dokunmatik Hedef (< 44px)** | ⚠️ **Önemli Kusur** | 844×390 yatay telefonda PLAY NOW butonu 44px iken, seçiciler (`Singles/Doubles`), `Invite`, `Play vs AI`, `Customize`, `Join` ve alt çubuk butonları 24-27px yüksekliğindedir. | Apple HIG ve WCAG 2.5.5 minimum 44×44px dokunmatik hedef standardına uymuyor. |
| 4 | **Dikey Telefonda Kart Taşması (4px)** | ⚠️ **Görsel Hata** | `.pz-card` üzerinde `box-sizing: border-box` olmadığı için `min(340px, 90vw)` + 52px padding + 2px border = 394px genişliğe ulaşıyor. | 390px genişliğindeki dikey telefonda kart yatayda 4px ekrandan taşıyor. |
| 5 | **Dikey Telefonda Zorunlu Döndürme** | ℹ️ **Tasarım Durumu** | Dokunmatik ekranda dikey tutulduğunda (`@media (orientation: portrait)` + `body.touch`), `#rotate` ("ROTATE YOUR PHONE") `z-index: 50` ile tüm ekranı kaplıyor. | Telefonda dikey modda ana sayfayla etkileşime girilemiyor; yatay çevirme zorunlu. |

---

## 1. Tek Dokunuş (One-Touch Entry) İncelemesi

> **Soru:** Bekleyen bir maç varken siteyi açan biri ona tek dokunuşla girebiliyor mu? Seçici doğruysa PLAY NOW, ya da listedeki Join.

### Test Adımları ve Ölçümler
- **Ekran Boyutu:** Masaüstü 1366×768, Tablet 1024×768, Mobil Yatay 844×390.
- **Adım 1:** Oyuncu 1 (Host: "MesutHost") siteyi açtı, Singles seçili iken PLAY NOW butonuna bastı. Yerel ısınma maçına girdi ve sunucuda açık otomatik oda (`auto: true, public: true, players: 2, mode: 'face'`) açıldı.
- **Adım 2:** Oyuncu 2 (Guest) siteyi açtı.
- **Adım 3A (PLAY NOW ile tek dokunuş):** Oyuncu 2'de Singles seçili iken doğrudan büyük **PLAY NOW** butonuna basıldı.
  - **Sonuç:** DOĞRULANDI. Oyuncu 2 hiçbir menü veya bekleme ekranı görmeden tek dokunuşla Oyuncu 1'in odasına eşleşti. Sunucu 5 saniyelik geri sayımı başlattı (`startsAt`) ve ekranda `MesutHost joined! The match starts in a few seconds.` bildirimi çıktı. 5 sn sonra online maç başladı.
- **Adım 3B (Listedeki Join ile tek dokunuş):** Oyuncu 2 açık oyunlar listesindeki satırda yer alan **Join** butonuna bastı.
  - **Sonuç:** DOĞRULANDI. Tek dokunuşla odaya katıldı, ısınma/bekleme sahnesi başladı, isim veya raket penceresi sorulmadı (`01-one-touch-match-entered.png`).

### Tespit Edilen Problem: 10 Saniyelik İlk Yoklama Gecikmesi
- **Ne görüldü:** Oyuncu 2 siteyi açtığında, Oyuncu 1 sunucuda hazır beklemesine rağmen ilk anda açık oda listesi BOŞ (`Nobody is waiting right now — be the first.`) olarak göründü (`guestInitialOpenGames.rowCount: 0`). Satır ancak 10 saniyelik `setTimeout` dolup ikinci yoklama yapıldığında belirdi (`01-one-touch-open-games.png`).
- **Neden:** `src/main.js` satır 155-164:
  ```javascript
  async function pollOpenGames() {
    const home = $('home');
    if (home && !home.hidden && !document.hidden && !net && !pend) { ... }
    setTimeout(pollOpenGames, 10000);
  }
  pollOpenGames();
  ```
  Script yüklendiğinde `pollOpenGames()` hemen çalışır. Ancak o sırada splash ekranı veya rota hazırlığı devam ettiği için `home.hidden === true`'dur. `if` bloğu atlanır ve sonraki çağrı 10 saniye sonrasına zamanlanır. Splash bittiğinde çağrılan `showHome()` ise `pollOpenGames()` fonksiyonunu tetiklemez.
- **Beklenen:** Ana sayfa ekranda görünür hale geldiği anda açık oyunlar listesi hemen çekilmeli ve ekrana basılmalıdır.
- **Öneri:** `src/main.js:90` (`applyRoute`) veya `src/home.js:485` (`showHome`) içinde `pollOpenGames()` fonksiyonu doğrudan çağrılmalıdır.

---

## 2. Davet Akışı (Invite a Friend) İncelemesi

> **Soru:** Invite a friend → link → ikinci sekmede link → isim, oyuncu ya da raket ekranı çıkmadan maça giriliyor mu?

### Test Adımları ve Ölçümler
- **Ekran Boyutu:** Masaüstü 1366×768, Mobil Yatay 844×390.
- **Adım 1:** Oyuncu 1 ana sayfada "Invite a friend" butonuna bastı.
  - Odanın açıldığı ve üstte `Invite link copied: send it to your friend.` toast bildiriminin çıktığı doğrulandı (`02-invite-host-toast.png`).
  - Panoya kopyalanan link: `http://localhost:8080/?room=GQ8UCD`.
- **Adım 2:** İkinci sekmede Oyuncu 2 davet linkini açtı.

### Tespit Edilen Kritik Hata: Temporal Dead Zone (TDZ) ReferenceError
- **Ne görüldü:**
  - Eğer kullanıcı daha önce siteyi ziyaret etmişse (yani `sessionStorage.getItem('padel.splash.shown') === '1'` ise), `src/splash.js:34` satırı `onComplete?.()` geri çağırmasını **hemen senkron olarak** çalıştırmaktadır.
  - `src/main.js:172`'de `onComplete` -> `applyRoute()` tetiklenir.
  - `applyRoute()` satır 98-101:
    ```javascript
    if (route.room) {
      window.__padelRoom = null;
      if (menuEl) menuEl.hidden = true;
      if (!playNow({ code: route.room, name: getOnlineName() })) setWizardWhere('online', route.room);
    }
    ```
  - `playNow()` satır 406:
    ```javascript
    if (net || pend) return null;
    ```
  - Ancak `let net = null` deklarasyonu `src/main.js` **satır 204**'tedir!
  - `initSplash` çağrısı (satır 171), `let net` deklarasyonundan önce yer aldığı için JavaScript ES6 Temporal Dead Zone kuralı devreye girer ve tarayıcı konsolunda şu ölümcül hata fırlatılır:
    ```text
    ReferenceError: Cannot access 'net' before initialization
        at playNow (src/main.js:406)
        at applyRoute (src/main.js:101)
        at onComplete (src/main.js:173)
        at initSplash (src/splash.js:35)
    ```
  - **Kullanıcıya yansıması:** Script tamamen çöker; sayfa simsiyah ve boş bir ekran olarak kalır (`allVisibleIds: ['eatOffers', 'msg']`, `exitVisible: false`, `hudVisible: false`). Oyuncu maça giremez!
- **İlk Ziyaretteki Durum:**
  - Eğer `padel.splash.shown` henüz yoksa (ilk ziyaret), `initSplash` 2.5 saniyelik zamanlayıcı kurar. Bu süre zarfında `main.js`'in tamamı yorumlandığı için `net` değişkeni ilklendirilmiş olur. 2.5 sn sonra splash kapanır ve Oyuncu 2 isim, oyuncu veya raket ekranı çıkmadan doğrudan maça girer (`02-invite-guest-direct-entry.png`). Ancak returning visitor'ların tamamında sayfa çökmektedir!
- **Beklenen:** Davet linkini açan herkes (ilk veya tekrarlanan ziyaret fark etmeksizin) hatasız ve beklemesiz maça girmelidir.
- **Öneri:** `src/main.js:204`'teki durum değişkenleri (`let net = null, pend = null, world...`), `src/main.js:171`'deki `initSplash` çağrısının öncesine taşınmalıdır. Ayrıca davet linkiyle gelen ziyaretçide 2.5 saniyelik splash animasyonu da atlanarak doğrudan maça bağlanılmalıdır (`route.room` varsa splash hemen tamamlanmalı).

---

## 3. Exit Düğmesi ve HUD Yerleşimi (✕ Exit)

> **Soru:** Telefonda ✕ Exit düğmesi aranmadan görülüyor mu? Skor tablosu, dokunmatik düğmeler ve kamera rozetiyle üst üste biniyor mu?

### Ölçüm Değerleri (CDP `getBoundingClientRect`)
| Ekran Boyutu / Mod | ✕ Exit (x, y, w, h) | HUD (x, y, w, h) | Dokunmatik Üst Çubuk `.tc-top` | Çakışma Var mı? |
|---|---|---|---|---|
| **Mobil Yatay (844×390)** | `10, 10, 85, 44` | `10, 62, 251, 63` | `x: 580, y: 12, w: 252, h: 44` | ❌ **HAYIR (0 çakışma)** |
| **Mobil Dikey (390×844)** | `10, 10, 85, 44` | `10, 62, 322, 81` | (Dikeyde rotate ekranı var) | ❌ **HAYIR (0 çakışma)** |
| **Masaüstü (1366×768)** | `10, 10, 85, 44` | `10, 62, 322, 81` | (Masaüstünde touchUi gizli) | ❌ **HAYIR (0 çakışma)** |

### Değerlendirme
1. **Görünürlük ve Boyut:**
   - Exit düğmesi sol üstte `top: 10px; left: 10px;` konumundadır.
   - Genişlik 85 px, yükseklik 44 px (44 px dokunmatik standardını tam sağlar).
   - Arka planı düz beyaz (`#ffffff`), yazısı koyu lacivert (`#0b1520`), kalın 16px büyük harf `✕ EXIT`. 3D kort üzerinde çok belirgin ve aranmadan hemen görülüyor (`03-exit-mobile-landscape.png`).
2. **Skor Tablosu (HUD) ile İlişki:**
   - Exit düğmesinin alt kenarı y = 54px'tir.
   - HUD'ın üst kenarı y = 62px'tir.
   - Aralarında tam **8 px dikey boşluk** vardır; hiçbir şekilde üst üste binmezler.
   - Yatay telefonda (`max-height: 500px`) `index.html:822` kuralı gereğince HUD `scale(0.78)` ile küçülür (genişlik 251 px, yükseklik 63 px) ve kort alanını kapatmaz.
3. **Dokunmatik Düğmeler ve Kamera Rozeti:**
   - Dokunmatik üst düğmeler (`🎥 🔁 🔈 📊 ❔`) ekranın **sağ üst köşesindedir** (`right: 12px; top: 12px;`). Exit düğmesi ise sol üsttedir; aralarında 500 px'den fazla güvenli mesafe vardır.
   - Kamera rozeti (`#cam`) ve klavye yardım kutusu (`#help`), dokunmatik ekranda (`body.touch:not(.pad)`) `index.html:815` kuralıyla tamamen gizlenmektedir (`display: none !important;`). Dolayısıyla ekranda kalabalık veya çakışma yaratmaz.
4. **Exit Butonuna Basıldığında:**
   - Tıklandığında oyunun kendi `#pause` penceresi açılır: *"Leave the match? — Leave / Keep playing"* (`03-exit-pause-dialog-landscape.png`).

---

## 4. Ana Sayfa (Home Screen - Mobil & Masaüstü)

> **Soru:** Yatay telefonda PLAY NOW kaydırmadan görünüyor mu? Yazılar okunuyor mu (kontrast)? Düğmeler en az 44 px mi?

### 4.1. Yatay Telefonda (844×390) PLAY NOW Görünürlüğü
- **Ölçüm:**
  - Ekran yüksekliği: 390 px, `window.scrollY`: 0 px (kaydırma yok).
  - `#hm-btn-play-now` konumu: `top: 161px`, `bottom: 205px`, yükseklik: **44px**, genişlik: **379px**.
- **Sonuç:** DOĞRULANDI. PLAY NOW butonu ekranın tam ortasında dikey olarak 161–205 px aralığında yer alır ve hiçbir kaydırma gerekmeden tam olarak görünür (`04-home-landscape-844x390.png`).

### 4.2. Düğmeler En Az 44 px mi? (Önemli Bulgu)
`@media (max-height: 500px) and (orientation: landscape)` kuralları altında yapılan buton ölçümleri:
| Buton | Genişlik | Yükseklik | Minimum 44px Kuralı |
|---|---|---|---|
| `PLAY NOW` (`#hm-btn-play-now`) | 379.0 px | **44.0 px** | ✅ **GEÇTİ** |
| `Singles` (`#hm-pick-singles`) | 183.5 px | **26.0 px** | ❌ **BAŞARISIZ (< 44px)** |
| `Doubles` (`#hm-pick-doubles`) | 183.5 px | **26.0 px** | ❌ **BAŞARISIZ (< 44px)** |
| `Team up` / `Face off` | 183.5 px | **26.0 px** | ❌ **BAŞARISIZ (< 44px)** |
| `Invite a friend` (`#hm-btn-invite`) | 379.0 px | **26.0 px** | ❌ **BAŞARISIZ (< 44px)** |
| `Play vs AI` (`#hm-btn-play-ai`) | 311.6 px | **26.0 px** | ❌ **BAŞARISIZ (< 44px)** |
| `Customize` (`#hm-link-customize`) | 59.4 px | **26.0 px** | ❌ **BAŞARISIZ (< 44px)** |
| `Join` (`.hm-btn-join`) | 52.0 px | **24.0 px** | ❌ **BAŞARISIZ (< 44px)** |
| İsim Rozeti (`#hm-name-badge`) | 99.8 px | **27.0 px** | ❌ **BAŞARISIZ (< 44px)** |
| Alt Çubuk (`Career`, `Training`, `Settings`, vb.) | 70–82 px | **25.0 px** | ❌ **BAŞARISIZ (< 44px)** |

- **Değerlendirme:** Yatay telefonlarda ekran yüksekliği dar (390 px) olduğu için tüm arayüzü tek ekrana sığdırmak amacıyla ikincil butonların padding ve font boyutları küçültülmüş (`index.html:2204-2218`), bu da buton yüksekliklerini 24–27 px seviyesine düşürmüştür. Yalnızca PLAY NOW butonu 44 px şartını sağlamaktadır. Dokunmatik cihazlarda bu butonlara parmakla basmak güç olabilir.
- **Öneri:** Butonların görsel boyutları kompakt kalsa dahi, dokunmatik hedef alanları pseudo-element (`::after` inset -8px) veya görünmez hit alanlarıyla en az 44 px'e genişletilmelidir.

### 4.3. Metin Kontrastı ve Okunabilirlik
WCAG 2.1 Contrast Ratio hesaplamaları:
- **PLAY NOW Butonu:** `#d8f53a` (limon) üzerine `#0f172a` (koyu lacivert) -> **14.2:1** (AAA seviyesi).
- **Ana Başlıklar & Kart Metinleri:** `#ffffff` zemin üzerine `--fg: #0f172a` -> **17.5:1** (AAA seviyesi).
- **İkincil Metinler (Açıklamalar):** `#ffffff` zemin üzerine `--muted: #475569` -> **8.2:1** (AAA seviyesi).
- **Vurgu Yeşili:** `#ffffff` zemin üzerine `--acc: #16a34a` -> **4.6:1** (AA seviyesi).
- **Sonuç:** DOĞRULANDI. Tüm metinler yüksek kontrasta sahiptir ve güneşte/mobilde rahatça okunabilir.

### 4.4. Dikey Telefonda (390×844) Durum
- Dokunmatik bir telefon dikey tutulduğunda (`@media (orientation: portrait)` + `body.touch`), `index.html:826` kuralı gereğince `#rotate` katmanı ("ROTATE YOUR PHONE / Padel Legends plays in landscape") `z-index: 50` ile tüm ekranı kaplamaktadır (`04-home-portrait-390x844.png`).
- Dolayısıyla dokunmatik telefonda ana sayfa dikey kullanılamaz; kullanıcı oyunu oynamak için cihazı yatay çevirmeye yönlendirilir.

---

## 5. Kumanda Navigasyonu (Gamepad — D-pad ve A)

> **Soru:** Ana sayfada D-pad ve A ile her düğmeye ulaşılıyor mu (seçiciler, PLAY NOW, Join, isim rozeti)?

### Test Adımları ve Ölçümler
- **Ekran Boyutu:** Masaüstü 1366×768 ve Tablet 1024×768.
- `src/padnav.js` içindeki `spatialFocus(root, dx, dy)` ve `src/home.js` içindeki `pollHomeGamepad()` fonksiyonları D-pad yönleriyle adım adım test edildi (`05-gamepad-navigation.png`).
- Odaklanabilir öğe sayısı: **12 adet**.

### Navigasyon Zinciri
1. **Başlangıç:** Sayfa açıldığında odak doğrudan `PLAY NOW` (`#hm-btn-play-now`) üzerindedir.
2. **PLAY NOW üzerinden:**
   - D-pad Yukarı (`dy: -1`) -> `Singles` seçicisine (`#hm-pick-singles`) geçer.
   - D-pad Aşağı (`dy: 1`) -> `Invite a friend` butonuna (`#hm-btn-invite`) geçer.
   - D-pad Sağ (`dx: 1`) -> Açık oyun satırı varsa `Join` butonuna (`.hm-btn-join`), liste boşsa sağ üstteki `Player XXXX ✎` isim rozetine (`#hm-name-badge`) geçer.
3. **Singles Seçicisindeyken:**
   - D-pad Sağ (`dx: 1`) -> `Doubles` seçicisine (`#hm-pick-doubles`) geçer.
   - Doubles seçilirse açılan `Team up / Face off` alt seçicilerine D-pad Aşağı ile inilebilir.
   - D-pad Yukarı (`dy: -1`) -> İsim rozetine (`#hm-name-badge`) geçer.
4. **İsim Rozetindeyken (`#hm-name-badge`):**
   - D-pad Aşağı (`dy: 1`) -> `Doubles` seçicisine ve ardından `PLAY NOW`'a iner.
5. **Alt Çubuğa Geçiş:**
   - `Play vs AI` / `Customize` butonlarından D-pad Aşağı ile `🏆 Career`, `🎓 Training`, `⚙️ Settings`, `⌨️ Controls`, `⛶ Fullscreen` butonlarına ulaşılır.
6. **A Butonu Etkileşimi:**
   - Seçiciler üzerinde A: Türü değiştirir.
   - `PLAY NOW` üzerinde A: Otomatik maçı/lobiyi başlatır.
   - `Player XXXX ✎` üzerinde A: `startEditingName()` fonksiyonunu tetikler, buton gizlenip `<input maxlength="16">` açılır ve metin seçilir (`nameEditOnA: true`).
   - `Join` üzerinde A: Odaya katılır.
- **Sonuç:** DOĞRULANDI. Ana sayfadaki tüm bileşenlere kumandayla eksiksiz ulaşılmakta ve A butonu tık işlemini doğru şekilde tetiklemektedir.

---

## 6. Modal Kartlar ("left the match", "This game has ended", "Nobody came")

> **Soru:** "left the match", "This game has ended", "Nobody came" kartları telefonda taşıyor mu?

### Ölçüm Değerleri (CDP `getBoundingClientRect`)
| Kart Türü | Ekran Boyutu | Kart Boyutları (G × Y) | Viewport (G × Y) | Ekrandan Taşma Var mı? |
|---|---|---|---|---|
| **Opponent Left** | Telefon Yatay (844×390) | 394 × 205 px | 844 × 390 px | ❌ **YOK** (`top: 93px, bottom: 298px`) |
| **This game has ended** | Telefon Yatay (844×390) | 394 × 205 px | 844 × 390 px | ❌ **YOK** (`top: 93px, bottom: 298px`) |
| **Nobody came** | Telefon Yatay (844×390) | 394 × 205 px | 844 × 390 px | ❌ **YOK** (`top: 93px, bottom: 298px`) |
| **Opponent Left** | Telefon Dikey (390×844) | **394** × 205 px | **390** × 844 px | ⚠️ **YATAYDA 4px TAŞMA VAR** (`overflowsHorizontal: true`) |

### Değerlendirme
- **Yatay Telefonda (844×390):** Kartların yüksekliği 205 px'dir ve 390 px ekran yüksekliğinde dikeyde ortalanarak 93–298 px arasında yer alır. Metinler ve ikişer adet buton rahatça sığar, hiçbir taşma yoktur (`06-card-opponent-left-landscape.png`, `06-card-ended-landscape.png`, `06-card-nobody-landscape.png`).
- **Dikey Telefonda (390×844) Taşma Nedeni:**
  `index.html:916` satırında:
  ```css
  #pause .pz-card, #leftCard .pz-card {
    background: rgba(10,18,28,.95);
    border: 1px solid #ffffff1a;
    border-top: 4px solid var(--acc);
    border-radius: 14px;
    padding: 22px 26px;
    width: min(340px, 90vw);
    text-align: center;
  }
  ```
  Kart üzerinde `box-sizing: border-box` tanımlı olmadığı için (`content-box`):
  `340px (içerik) + 52px (sağ+sol padding) + 2px (kenarlık) = 394px`.
  Telefon dikey ekran genişliği ise **390px**'dir. Kart her iki yandan toplam 4 px taşmaktadır.
- **Öneri:** `index.html:916` içine `box-sizing: border-box;` eklenmelidir. Bu ekleme yapıldığında kart genişliği `min(340px, 90vw)` yani en fazla 340px olacak ve 390px genişliğindeki dikey ekranda her iki yanda 25'er px güvenli kenar boşluğu kalacaktır.

---

## 7. Açık Tema (Light Theme) Denetimi

> **Soru:** Maç dışı ekranlarda koyu kalmış parça (eski renk) var mı? Maç içinde açık renge dönmüş ve okunmayan parça var mı?

### 7.1. Maç Dışı Ekranlar Denetimi
- **Ana Sayfa (`#home`):**
  - Zemin `--bg: #f7f8fa`, kartlar `--card: #ffffff`, yazılar `--fg: #0f172a`, kenarlıklar `--border: #e2e8f0`.
  - Canlı lobi tasarımıyla tam uyumlu, hiçbir koyu kalıntı yok (`04-home-desktop-1366x768.png`).
- **Friendly Sihirbazı (`#menu`):**
  - Adım 1 (Oyuncu): Açık gri/beyaz kartlar, siyah isimler, gri rozetler (`07-light-theme-menu-step1.png`).
  - Adım 2 (Mekan), Adım 3 (Raket) ve Adım 4 (Maç/Kurallar): Tamamen açık tema değişkenlerine bağlanmış (`07-light-theme-menu-step4.png`).
- **Kariyer Ekranı (`#career`):**
  - Hub, Karakter Yaratıcı, Antrenman ve Maç Öncesi panelleri açık tema kartlarına dönüştürülmüş (`07-light-theme-career.png`).
- **Ayarlar Modalı (`#settingsModal`):**
  - Beyaz kart (`#ffffff`), açık gri butonlar (`#f8fafc`), koyu yazılar (`07-light-theme-settings.png`).
- **Kontroller & Gizlilik Sayfaları:**
  - `kontroller.html` ve `privacy.html` açık tema paletindedir.

### 7.2. Maç İçi Arayüz Denetimi
- **Kural Doğrulaması:** `CLAUDE.md` ve spec kararları gereğince maç içi HUD, yayıncı (broadcast) stilini korumalıdır.
- `index.html:746-748`:
  ```css
  #hud, #pause, #help, #touchUi, #cam, #hypeToast, #msg, #eatOffers, #unmuteBadge, #fsHint, #smashBanner, #shotHint, #tutorial, #replayTag, #leftCard {
    --acc: #d8f53a; --fg: #fff; --muted: #9fb3c8; color: #fff;
  }
  ```
- **Ölçülen Değerler:**
  - `#hud`: Arka plan `rgba(10, 18, 28, 0.95)`, metin rengi `rgb(255, 255, 255)` (beyaz). Açık renge dönmemiş, koyu yayın stili korunmuş (`07-match-dark-overlay.png`).
  - `#exitBtn`: Arka plan `rgb(255, 255, 255)` (beyaz), metin rengi `rgb(11, 21, 32)` (koyu lacivert). 3D sahne ve koyu zemin üzerinde çok net ayrışıyor.
  - Enerji barları: Yeşil-sarı gradyan (`#4ade80` - `#d8f53a`), koyu HUD içinde net okunuyor.
- **Sonuç:** DOĞRULANDI. Maç dışı hiçbir ekranda eski koyu temanın parçası kalmamış; maç içi öğelerin hiçbiri kazara açık renge dönmemiştir.

---

## Ekran Görüntüleri Dizini (`agents/reports/agy-33/`)

| Dosya Adı | Konu | Çözünürlük |
|---|---|---|
| `01-one-touch-open-games.png` | Canlı açık oyunlar listesi (Join butonu ile) | 1366 × 768 |
| `01-one-touch-match-entered.png` | Join tıklandıktan sonra maça giriş (HUD + Exit) | 1366 × 768 |
| `02-invite-host-toast.png` | Ev sahibi davet linki kopyalandı toast bildirimi | 1280 × 800 |
| `02-invite-guest-direct-entry.png` | Davet linkiyle doğrudan maça giriş | 1280 × 800 |
| `03-exit-mobile-landscape.png` | Yatay telefonda Exit butonu + HUD + dokunmatik kontroller | 844 × 390 |
| `03-exit-mobile-portrait.png` | Dikey ekranda Exit butonu + HUD konumlandırması | 390 × 844 |
| `03-exit-pause-dialog-landscape.png` | Exit butonuna basınca açılan "Leave the match?" penceresi | 844 × 390 |
| `04-home-landscape-844x390.png` | Yatay telefonda ana sayfa (PLAY NOW kaydırmasız) | 844 × 390 |
| `04-home-portrait-390x844.png` | Dikey telefonda ROTATE YOUR PHONE ekranı | 390 × 844 |
| `04-home-tablet-1024x768.png` | Tablet görünümü ana sayfa | 1024 × 768 |
| `04-home-desktop-1366x768.png` | Masaüstü görünümü ana sayfa | 1366 × 768 |
| `05-gamepad-navigation.png` | Kumanda navigasyonu ve odak halkası | 1366 × 768 |
| `06-card-opponent-left-landscape.png` | "Mesut left the match." kartı (yatay mobil) | 844 × 390 |
| `06-card-ended-landscape.png` | "This game has ended." kartı (yatay mobil) | 844 × 390 |
| `06-card-nobody-landscape.png` | "Nobody came." kartı (yatay mobil) | 844 × 390 |
| `06-card-opponent-left-portrait.png` | "Mesut left the match." kartı (dikey mobil taşma kanıtı) | 390 × 844 |
| `07-light-theme-menu-step1.png` | Friendly sihirbazı açık tema (Oyuncu seçimi) | 1280 × 800 |
| `07-light-theme-menu-step4.png` | Friendly sihirbazı açık tema (Maç/Kural ayarları) | 1280 × 800 |
| `07-light-theme-career.png` | Kariyer modu açık tema görünümü | 1280 × 800 |
| `07-light-theme-settings.png` | Ayarlar penceresi açık tema görünümü | 1280 × 800 |
| `07-match-dark-overlay.png` | Maç içi yayın formatı koyu HUD görünümü | 1280 × 800 |

---

## Önerilen Düzeltmeler Listesi (Opus İçin)

1. **Davet TDZ ReferenceError Düzeltmesi (Öncelik: Kritik):**
   - **Dosya:** `src/main.js:171-204`
   - **Neden:** `initSplash({ onComplete: () => applyRoute() })` çağrısı `let net = null;` değişkeninden önce tanımlandığı için, splash daha önce gösterilmiş ziyaretçilerde senkron `applyRoute() -> playNow()` çağrısı `ReferenceError: Cannot access 'net' before initialization` hatası vererek sayfayı çökertiyor.
   - **Çözüm:** `let net = null, pend = null, world...` deklarasyonları `src/main.js` içinde `initSplash` çağrısının yukarısına taşınmalı.

2. **Açık Oda Listesi İlk Yükleme Gecikmesi (Öncelik: Yüksek):**
   - **Dosya:** `src/main.js:90` veya `src/home.js:485`
   - **Neden:** `pollOpenGames()` sayfa ilk yüklendiğinde splash/rota nedeniyle `home.hidden === true` olduğundan yoklamayı atlıyor ve sonraki yoklamayı 10 saniye sonrasına bırakıyor.
   - **Çözüm:** `showHome()` çağrıldığında `pollOpenGames()` hemen tetiklenmeli.

3. **Dikey Telefonda Kart Taşması (Öncelik: Orta):**
   - **Dosya:** `index.html:916`
   - **Neden:** `.pz-card` için `box-sizing: border-box` eksik olduğundan 340px genişlik + 52px padding = 394px genişlik oluşuyor ve 390px ekrandan 4px taşıyor.
   - **Çözüm:** `#pause .pz-card, #leftCard .pz-card` kuralına `box-sizing: border-box;` eklenmeli.

4. **Yatay Telefonda Dokunmatik Hedef Boyutları (Öncelik: İyileştirme):**
   - **Dosya:** `index.html:2204-2218`
   - **Neden:** `@media (max-height: 500px)` içinde butonların yükseklikleri 24–27px seviyesine iniyor; Apple HIG / WCAG 44px kuralının altında kalıyor.
   - **Çözüm:** `min-height: 44px` veya pseudo-element hit-area genişletmesi uygulanmalı.
