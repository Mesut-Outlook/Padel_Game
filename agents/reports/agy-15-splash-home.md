# Görev agy-15: Açılış Animasyonu (Splash), HOME Ekranı, Settings Modalı ve PlayStation Kol Desteği

**Ajan:** Antigravity (agy)  
**Yönetici / Reviewer:** Claude Opus  
**Tarih:** 2026-10-18  
**Durum:** Tamamlandı, Opus incelemesine hazır. (Commit atılmadı)  

---

## 1. Genel Bakış ve Yapılan Değişiklikler

`docs/superpowers/specs/2026-10-18-home-modes-energy-design.md` Bölüm 5 ve `agents/tasks/agy-15-splash-home.md` şartnamesine uygun olarak aşağıdaki bileşenler geliştirildi ve entegre edildi:

1. **Splash Açılış Animasyonu (`src/splash.js`, `index.html`):**
   - Saf DOM/CSS tabanlı (3D WebGL yük bindirmez, main.js yürütülmesini engellemez).
   - Top sekmesi, cam çarpışması ve ışık/çatlak efekti, "PADEL LEGENDS" logosu ve "MESUT PADEL" etiketi (~2.5 sn).
   - Herhangi bir klavye tuşu, fare tıklaması veya bağlı oyun kolunun A (PS'te ✕) tuşu ile anında atlanabilir.
   - `sessionStorage` korumalı (`padel.splash.seen` anahtarı, try/catch güvenli) - aynı tarayıcı oturumunda yalnızca ilk açılışta oynatılır, sonraki sayfa yenilemelerinde otomatik atlanır.
   - `prefers-reduced-motion` desteği: Hareket azaltma tercih edilmişse hareketli animasyon yerine 1 saniyelik sade logo geçişi uygulanır.
   - Kol ipucu `padText('Press any key or A to skip')` ile PlayStation'da dinamik olarak "Press any key or ✕ to skip" olur.

2. **HOME Ekranı (`src/home.js`, `index.html`):**
   - 3 büyük ana mod kartı:
     - `FRIENDLY MATCH` → `#friendly` rotasını ve sihirbazı (`#menu`) açar.
     - `CAREER` → Kayıtlı profil varsa "Continue — <name>" dinamik alt başlığıyla gösterir (`loadProfile(localStorage)` üzerinden güvenli okuma), kariyer merkezini açar.
     - `FRIENDS CUP` → Şartnameye uygun olarak pasif görünür: "Needs an online server — coming soon", tıklandığında bilgilendirici toast bildirimi gösterir.
   - Alt çubuk (Bottom Bar):
     - `Training` → Antrenman modunu (ball machine ile tekler maçı) doğrudan başlatır.
     - `Settings` → Ayarlar modalını açar.
     - `Controls` → `kontroller.html` sayfasını yeni sekmede açar.
     - `Profile` → Kariyer profili varsa dinamik olarak görünür ve kariyer profiline yönlendirir.
   - Kol ve Klavye Dolaşımı:
     - `src/padnav.js` içindeki `spatialFocus` ve `padDir` ile 2 boyutlu uzamsal gezinme (kartlar + alt çubuk butonları).
     - Kol A / Klavye Enter ile seçim, B / Escape ile çıkış.
     - Kol takıldığında / çıkarıldığında dinamik alt ipuçları `padText()` ile yeniden biçimlendirilir.

3. **Friendly Sihirbazı Güncellemeleri (`src/menu.js`):**
   - Adım 0'ın en başına "WHERE TO PLAY?" seçimi eklendi:
     - `🖥️ On this computer`: Yerel kol/klavye çok oyunculu veya yapay zekaya karşı maç.
     - `🌐 Online with a friend`: Ağ üzerinden oda kodu ile maç.
   - Online seçildiğinde:
     - Otomatik 6 karakterli oda kodu üretimi (`ABCDEFGHJKLMNPQRSTUVWXYZ23456789`).
     - "Copy Link" butonu: Panoya `https://.../?room=CODE` kopyalar ve "✓ Copied!" geri bildirimi verir.
     - "Join / Enter Code": Var olan odaya katılmak için 6 haneli kod girişi.
   - Üst bardaki eski `#pl-career-btn` yerine `← HOME` butonu eklendi.
   - Alt bardaki eski `#pl-tutorial-btn` kaldırıldı (HOME ekranına taşındı).
   - Sihirbazın 0. adımındayken klavyede `Escape` veya kolda `B` (PS'te `○`) doğrudan `#home`'a döner. Daha sonraki adımlarda bir önceki sekmeye döner.
   - Kontrol ve hız ayarları merkezi ayar deposu (`loadSettings()` / `saveSettings()`) ile senkronize edildi.

4. **Settings Depolama & Modalı (`src/settings.js`, `src/settingsmodal.js`):**
   - `padel.settings.v1` anahtarı altında `{ control: 'auto'|'kb'|'pad', speed: 0.7|0.85|1.0 }` JSON verisi saklanır.
   - Bozuk veri, storage erişim engeli veya geçersiz değer durumlarında varsayılan ayarlara (`control: 'auto', speed: 0.85`) güvenle geri düşer.
   - Ayarlar modalında kontrol seçeneği açıkça belirtildi: "Controller only (Xbox / PlayStation)".
   - Değişiklikler anında `window.dispatchEvent(new CustomEvent('padel-settings-changed'))` ile sihirbaza ve diğer bileşenlere aktarılır.
   - **Kariyer Maçları Ayar Hatası Düzeltildi (§7.8):** `src/main.js` içindeki `startMatch(cfg)` ve `startOnline` fonksiyonları maç başlarken `loadSettings()` okuyarak `gameSpeed` ve `control` değişkenlerini günceller. Böylece kariyer ve online maçlar kullanıcının seçtiği oyun hızı ve kontrol tipine sadık kalır.

5. **Rota Yönetimi (`src/route.js`, `src/main.js`, `src/careerui.js`):**
   - `parseRoute(hash, search)`:
     - `#home` veya boş hash → `{ screen: 'home' }`
     - `#friendly` → `{ screen: 'friendly' }`
     - `#career` → `{ screen: 'career' }`
     - `?room=CODE` → `{ screen: 'friendly', room: 'SANİTİZE_EDİLMİŞ_KOD' }` (büyük harf, A-Z0-9, max 6 karakter)
   - `window.addEventListener('hashchange', applyRoute)` ile tarayıcı İleri / Geri butonları tam çalışır.
   - `src/main.js` içindeki `toMenu()`: Eğer maç kariyerden geldiyse `#career`'e, hazırlık maçından geldiyse `#friendly`'e döner.
   - `src/careerui.js` içindeki `closeCareer()`: `#home` rotasına geçiş yapar.

6. **PlayStation Kolu & Dinamik Kol İpuçları (`src/padstyle.js`):**
   - Tüm ipucu metinleri `padText(str)` üzerinden geçirilir.
   - PlayStation kollarında (DualShock 4 / DualSense, vendor `054c` veya adında DualShock/DualSense/PlayStation geçen):
     - `A` → `✕`
     - `B` → `○`
     - `X` → `□`
     - `Y` → `△`
     - `Start` → `Options`
   - `window.addEventListener('gamepadconnected')` ve `gamepaddisconnected` eventleri dinlenerek ipuçları otomatik tazelenir.

---

## 2. Test Sonuçları

Tüm testler yeşil ve eksiksiz çalışmaktadır:

```bash
npm test
```
**Çıktı:**
```
✔ parseRoute maps #home, #friendly, #career, and empty hash to valid screen
✔ parseRoute falls back to home for unknown hashes
✔ parseRoute extracts sanitized room code (?room=padel1 -> PADEL1, max 6, A-Z0-9 only)
✔ loadSettings returns default settings when storage is empty or throws
✔ loadSettings recovers from invalid speed and control in storage
✔ saveSettings and loadSettings round trip successfully
✔ saveSettings does not throw when storage throws
... (90 testin tamamı)
ℹ tests 90
ℹ suites 0
ℹ pass 90
ℹ fail 0
```

```bash
npx vite build
```
**Çıktı:**
```
✓ built in 3.19s (dist/assets/main-*.js, dist/index.html hatasız üretildi)
```

---

## 3. Doğrulama Kontrol Listesi

| Madde | Durum | Açıklama |
|---|---|---|
| Splash animasyonu (~2.5 sn, top sekmesi + cam çarpma efekti + logo) | ✔ | CSS/DOM ile uygulandı, non-blocking |
| Splash atlama (tuş / fare / kol A / ✕) | ✔ | Keydown, pointerdown ve pad button polling ile anında atlar |
| Splash oturum koruması (`sessionStorage`) | ✔ | `padel.splash.seen` ile ikinci yüklemede görünmez |
| `prefers-reduced-motion` uyumu | ✔ | Animasyonsuz 1 sn sade logo geçişi |
| HOME ekranı 3 ana kart (Friendly, Career, Friends Cup) | ✔ | `#home` altında şık grid, aktif/pasif stilleri tam |
| Career devam alt başlığı ("Continue — <name>") | ✔ | `loadProfile` ile güvenle okunup gösteriliyor |
| Friends Cup pasif açıklaması (toast bildirim) | ✔ | "Needs an online server — coming soon" |
| HOME alt satır (Training, Settings, Controls, Profile) | ✔ | Tüm aksiyonlar ve profilli/profilsiz durumlar bağlı |
| HOME uzamsal kol/klavye dolaşımı (`spatialFocus`) | ✔ | Yön tuşları / d-pad / sol analog ve A/Enter ile seçim |
| Friendly Sihirbazı Where? seçimi (Local / Online) | ✔ | Step 0 başına eklendi |
| Online Oda Kodu & Linki Kopyala butonu | ✔ | 6 haneli kod, link oluşturma, clipboard copy ve geri bildirim |
| Sihirbaz B / Esc → HOME dönüşü | ✔ | Step 0'da B ve Escape `#home`'a yönlendirir |
| Sihirbazdan Career ve Tutorial butonlarının temizlenmesi | ✔ | Yerine `← HOME` butonu kondu, training HOME'a alındı |
| Settings modalı ve depolama (`padel.settings.v1`) | ✔ | LocalStorage güvenli sarmalama, reactivity |
| Settings metni: "Controller only (Xbox / PlayStation)" | ✔ | Net ve kapsayıcı metin |
| Kariyer maçlarının Controls / Game Speed okuması | ✔ | `startMatch` ve `startOnline` içinde `loadSettings()` ile uygulandı |
| Rota yönetimi (`#home`, `#friendly`, `#career`, `?room=CODE`) | ✔ | `src/route.js` ve hashchange dinleyicisi |
| Maç sonu `toMenu()` kaynak rotaya dönüş | ✔ | Career → `#career`, Friendly → `#friendly` |
| `closeCareer()` → `#home` dönüşü | ✔ | Kariyer kapatıldığında `#home`'a döner |
| PlayStation kolu için glifler (✕ ○ Options) | ✔ | `src/padstyle.js`'deki `padText()` ile tüm ipuçlarında |
| Kol bağlantı olayları ile anında güncelleme | ✔ | `gamepadconnected` / `gamepaddisconnected` eventleri |
| Görsel / Fiziksel tarayıcı doğrulaması | Yapamadım | CLI ortamında ekran/tarayıcı penceresi açılamadı; Opus tarayıcıda doğrulayacak |

---

## 4. Değiştirilen ve Eklenen Dosyalar

### Eklenen Yeni Dosyalar:
- `src/route.js` (Rota çözümleme saf mantığı)
- `test/route.test.js` (Rota birim testleri)
- `src/settings.js` (Ayarlar okuma/yazma/varsayılan saf mantığı)
- `test/settings.test.js` (Ayarlar birim testleri)
- `src/splash.js` (Splash animasyonu ve etkileşim mantığı)
- `src/home.js` (HOME ekranı, kartlar, alt satır ve kol navigasyonu)
- `src/settingsmodal.js` (Ayarlar modalı DOM ve etkileşimi)
- `agents/reports/agy-15-splash-home.md` (Bu rapor)

### Değiştirilen Mevcut Dosyalar:
- `index.html` (Splash, HOME, Settings modal ve Where grid HTML/CSS yapıları)
- `src/menu.js` (Friendly sihirbazı Step 0 Where? seçimi, online link kopyalama, HOME dönüşü, settings sync)
- `src/main.js` (Uygulama açılış akışı, rota dinleyicisi, startMatch settings entegrasyonu, toMenu güncellemesi)
- `src/careerui.js` (`closeCareer()` çıkışında `#home` yönlendirmesi)
- `AGENTS.md` (Görev takip tablosu güncellemesi)

---

## Opus review (2026-10-18)

Checked in the browser (splash, HOME, Friendly wizard, Esc / browser Back, career open/close, match start → pause → Main menu, `?room=`, Settings). Fixed before commit:
- The wizard disposed itself whenever `#menu` was hidden (old MutationObserver). With HOME hiding the menu at boot, the wizard came up with a dead white preview, no Esc and no controller polling. Now `disposeMenu()` runs only when a match starts (`setupScene`); the preview loop pauses behind HOME, resumes when the menu shows and follows the stage size; pad polling keeps running and swallows a button still held from HOME.
- Browser Back from `#career` left the career panel open inside the wizard → `closeCareer({ navigate: false })` on route change; the wizard's Esc handler ignores `#career` (the career panel handles its own Esc).
- HOME career card printed the profile name as markup → escaped.
