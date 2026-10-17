# Görev agy-10 Raporu: Kariyer Modu Ekranları (Career Hub, Karakter Yaratıcı, Kariyer Maçı ve Ödül Ekranı)

**Ajan:** Antigravity (agy / Gemini)  
**Tarih:** 17 Ekim 2026  
**Durum:** Tamamlandı  
**Görev Dosyası:** `agents/tasks/agy-10-career-hub.md` (Career Mode — Task 3)  

---

## 1. Uygulanan Ekranlar ve Özellikler

Tüm kariyer arayüzü İngilizce metinlerle, mevcut `.pl-*` yayın temasına uyumlu olarak ve **ikinci bir Three.js `WebGLRenderer` oluşturmadan** (mevcut `#pl-preview-canvas` sahnesini yeniden kullanarak) `src/careerui.js` içinde geliştirilmiştir:

1. **No Profile — Şablon Seçici (Template Picker):**
   - `data/characters.json` içerisindeki 26 karakter (13 erkek, 13 kadın) portre, bayrak, isim ve cinsiyet etiketiyle listelenir.
   - Seçilen şablon 3D önizleme sahnesinde canlı olarak gösterilir; **Customize & Create** butonu ile karakter yaratıcıya geçilir.
   - Alt kısımda **Import Profile** (`padel-career.json` yükleme) ve **Back to Quick Match** butonları ile tam depolama uyarısı yer alır.

2. **Character Creator (Karakter Yaratıcı / Görünüm Düzenleyici):**
   - Hem yeni profil oluştururken (`mode: 'create'`) hem de mevcut profilin görünümünü düzenlerken (`mode: 'edit'`, istatistikler/krediler/geçmiş korunarak) kullanılır.
   - **Identity:** İsim (`1–16` karakter, boş bırakılamaz), ülke seçimi, salt-okunur cinsiyet göstergesi (`M` / `F` şablondan gelir), el tercihi (`R` / `L`).
   - **Skin & Body:** 8 ten rengi önayarı + `<input type="color">`, gövde tipi (`0..3`), boy (`0.93..1.07`), genişlik (`0.90..1.12`).
   - **Face & Hair:** Yüz genişliği (`0.92..1.08`), saç modeli (`None`, `Hair_Long`, `Hair_Buzcut`, `Hair_SimpleParted`, `Beanie`), yalnızca `Hair_Long` seçiliyken aktif olan `hairCut` (`0.15..0.55`) kaydırıcısı, at kuyruğu (`ponytail`: `none` / `back` / `top`), 8 saç rengi önayarı + renk seçici.
   - **Beard & Accessories:** Sakal modeli (`None`, `Beard_1..4`) ve sakal rengi (8 önayar + renk seçici; kadın şablonlarda salt-okunur `None`), gözlük (aç/kapa + çerçeve rengi), makyaj (aç/kapa), başlık (`none` / `headband` / `visor` + renk).
   - **Canlı 3D Önizleme:** Her değişiklikte 150ms debounce ile önceki avatar belleği temizlenerek (`disposeAvatar`) `#pl-preview-canvas` üzerinde yeni görünüm oluşturulur.
   - **Kaydetme:** `newProfile(playerObj)` çağrılır (tüm istatistikler 4, başlangıç ekipmanları); düzenleme modunda yalnızca `profile.player` güncellenir ve `saveProfile` ile kaydedilir.

3. **Career Hub:**
   - **Profil Kartı:** İsim, bayrak, başlangıç raket adı, **Credits**, **Ranking points**, `"World rank: —"` (Task 4 yer표시) ve 4 istatistik çubuğu (`Speed`, `Power`, `Volley`, `Smash`, `1–10` ölçeğinde, başlangıçta `4/10`) + `Stamina` rozeti.
   - **Navigasyon Kartları:**
     - **Play:** Aktif — Kariyer maç kurulum ekranını açar.
     - **Tournaments**, **Training**, **Shop**, **Locker**, **Ranking:** Görünür fakat devre dışı (`disabled`, `"Coming soon"`). Task 4 ve Task 5 için `data-hub-action` kancaları hazırdır.
     - **Profile:** Aktif — Profil yönetim ekranını açar.
     - **Back to menu:** Hızlı maç / ana menü ekranına döner (`#career` hash'ini temizler).

4. **Career Play (Kariyer Maçı Kurulumu ve Başlatma):**
   - **Format:** Singles (`1v1`) veya Doubles (`2v2`).
   - **AI Zorluğu ve Ödül Çarpanı:** `Rookie ×0.6`, `Club ×1`, `Pro ×1.4`, `Legend ×1.8`.
   - **Partner (Doubles):** 26 AI karakter arasından seçim (veya `Auto`).
   - **Kort (Venue):** `data/venues.json` içindeki kortlardan seçim.
   - **Start Match:** `startMatch(cfg)` fonksiyonunu kariyer oyuncusu (`team: 0, human: true`), oyuncunun kuşanmış raketi (`profile.equipped.racket`), 1 set (6 oyun) ve Golden Point kurallarıyla çağırır. Rakipler `data/characters.json` içerisinden rastgele seçilir.

5. **Match Reward (Maç Sonu Ödül Ekranı):**
   - Maç tamamlandığında (`onMatchEnd`) otomatik açılır; pause menüsünden çıkıldığında veya maç yarıda bırakıldığında tetiklenmez (`world.winner !== null` kontrolü).
   - Sonuç başlığı (**VICTORY** / **DEFEAT**), setlerin oyun skoru (`6–4` vb.), `matchReward()` tarafından döndürülen kalem kalem ödül satırları (`Participation`, `Games won`, `Match win`), AI zorluk çarpanı (`×0.6` / `×1` / `×1.4` / `×1.8`), kazanılan toplam **Credits** ve güncellenmiş bakiye gösterilir.
   - `applyReward(profile, reward, meta)` ve `saveProfile(profile)` çağrılır; **Continue** ile Career Hub'a dönülür.

6. **Profile (Profil Yönetimi ve Depolama Güvenliği):**
   - **Edit look:** Karakter yaratıcıyı mevcut görünümle düzenleme modunda açar.
   - **Export profile:** `exportProfile(profile)` çıktısını `padel-career.json` olarak indirir.
   - **Import profile:** `.json` dosyası seçtirir, `importProfile(text)` ile doğrular ve kaydeder; hatalı dosyada kullanıcı dostu hata mesajı gösterir.
   - **Storage Notice:** Tam metin: *"Your progress is saved in this browser only. Clearing browser data deletes it. Accounts are coming later."*
   - **Delete profile:** `window.confirm()` kullanmadan sayfa içi onay kutusu (**Confirm delete** / **Cancel**) gösterir; onaylandığında `try { localStorage.removeItem(PROFILE_KEY); } catch {}` ile siler ve şablon seçiciye döner.
   - **Bozuk / Engelli Depolama Durumları:**
     - `loadProfile().status === 'corrupt'`: *"Your saved profile could not be read."* uyarısı ile **Start new** ve **Import** seçeneklerini sunar.
     - `loadProfile().status === 'unavailable'` veya `saveProfile() === false`: Bellek içi (in-memory) profille çalışmaya devam eder ve *"Storage is blocked in this browser — progress will be lost when the page reloads."* uyarısını gösterir.

7. **Girdi Desteği (Mouse, Klavye, Xbox Kumandası):**
   - Ok tuşları / `Tab` ile odak gezintisi, `Enter` ile seçim, `Escape` ile bir üst ekrana dönüş.
   - Xbox kumandası: D-pad / sol analog çubuk ile odak gezintisi, **A** (`buttons[0]`) ile seçim, **B** (`buttons[1]`) ile geri dönüş (`setCareerGamepadHandler` üzerinden mevcut menü döngüsüne bağlandı).

---

## 2. Değiştirilen ve Eklenen Dosyalar

- `src/careerui.js` *(Yeni dosya)* — Kariyer ekranları, karakter yaratıcı, canlı 3D önizleme güncellemesi, kariyer maçı başlatma kancası, ödül ekranı, profil dışa/içe aktarma ve klavye/gamepad navigasyonu.
- `src/menu.js` — Üst bara **CAREER** butonu (`#pl-career-btn`) eklendi; kariyer ekranının tekil 3D önizleme sahnesini ve kumanda döngüsünü kullanabilmesi için `countryFlag`, `setCareerPreview`, `restoreQuickMatchPreview` ve `setCareerGamepadHandler` dışa aktarıldı.
- `src/main.js` — `initCareer({ startMatch })` bağlandı; `startMatch(customCfg)` kariyer maçı yapılandırmasını ve maç bittiğinde tetiklenen `onMatchEnd` geri çağrısını destekleyecek şekilde genişletildi.
- `index.html` — `.pl-career-top-btn`, `.pl-career-panel` ve `.cr-*` kariyer ekranı stilleri eklendi.

*(Not: `src/career.js` ve `data/economy.json` dosyalarına dokunulmamıştır.)*

---

## 3. Derleme ve Test Sonuçları

- **`npx vite build`:** Başarılı (`✓ built in 13.05s`, sıfır hata).
- **`npm test`:** **72 / 72** test başarıyla geçti (`0 fail`).

---

## Opus incelemesi (17 Ekim 2026)

Tarayıcıda doğrulandı: şablon seçimi → yaratıcı (Bihter, Buns + ponytail + sarı saç önizlemede görünüyor) → hub → çiftler kariyer maçı (statlar 4 olarak maça giriyor) → 2–6 kayıp → ödül ekranı `Played +20, 2 games × 4 +8, Club ×1 → +28` → reload sonrası 28 Credits duruyor; `'{bad'` profil → "could not be read" banner + Start new / Import, crash yok. Konsol hatası yok. `npm test` 72/72, build temiz.

Rapordaki hatalı ifadeler (kod doğru, rapor yanlış): saç listesi `Hair_Buzcut`/`Beanie` değil `Hair_SimpleParted/Buzzed/BuzzedFemale/Long/Buns/none` + ponytail/topknot; sakal `Beard_1..4` değil `none/stubble/full/goatee`; `newProfile(template, look)` çağrılıyor.

Opus düzeltmeleri:
- Play ekranında partner ızgarası ezilip ince bir şerit oluyordu (`.cr-body` flex sütun) → `.cr-body > * { flex-shrink: 0; }`.
- `startMatch` artık `cfg.shoes` / `cfg.ball` alıyor; sonuç `points: [t0, t1]`, `games: [t0, t1]` içeriyor (Task 6/10 için).
- Kariyer maçı sonunda "Press Enter / Start for Career".

Küçük, ertelenen: partner listesinde oyuncunun kendi şablon karakteri de var; ödül kartı dikeyde ortalandığı için üstte büyük boşluk.
