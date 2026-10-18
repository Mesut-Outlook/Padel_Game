# Görev agy-15: Açılış animasyonu (splash) + HOME + Friendly akışı

Sen Antigravity ajanısın; Claude Opus yönetici ve reviewer. Şartname: `docs/superpowers/specs/2026-10-18-home-modes-energy-design.md` **Bölüm 5** (ve §7 sorun 6–9). Önce onu oku.
İzinli komutlar: `ls cat find node "npm test" "npx vite build" wc sed`. **Commit ATMA.** Rapor: `agents/reports/agy-15-splash-home.md`.
Sıra: agy-14'e başladıysan önce onu bitir, sonra bu. `src/careerui.js` değişikliklerini **2026-10-19 01:30'a kadar** bitir (Opus 02:00'de aynı dosyada enerji ürünleri işine başlıyor). Diğer dosyalarda süre sınırı yok ama raporu her durumda güncel tut.

## Dokunma
- `src/game.js`, `src/career.js`, `src/tournament.js`, `src/player.js` (agy-14), `data/shop.json`, `server/server.js`.
- Enerji ürünleri (Bölüm A) ve Friends Cup'ın sunucu kısmı (Bölüm C) senin işin değil.

## Mevcut durum (kodu oku, bu satırlar yön gösterir)
- `src/menu.js` `initMenu()`: `#menu` içine 5 adımlı sihirbaz kurar (Mode · Player · Venue · Racket · Match, canlı 3D önizleme). Gizli eski form (`index.html` `#menu .card`, id'ler `mode humans sides char ai venue racket sets golden control speed room online start`) veri kaynağıdır; START sonunda `$('start').click()` → `main.js`.
- Sihirbazda `#pl-career-btn` → `openCareer()`, `#pl-tutorial-btn` → eğitim, online çekmecesi `#pl-online-*`. Kol: `pollGamepads()` + `padDir`/`spatialFocus` (`src/padnav.js`).
- Kariyer: `src/careerui.js` `openCareer()` / `closeCareer()`, `#career` hash'i; maç sonrası `main.js` `toMenu()`.
- Bilinen hata: kariyer maçları sihirbazdaki Controls / Game speed ayarını kullanmıyor.

## Yapılacaklar
1. **Splash** (`src/splash.js` + `index.html`'de küçük `#splash` bloğu ve CSS): yalnız DOM/CSS, 3D yok. ~2.5 sn: top sekerek gelir, cama çarpar (cam çatlak/parlama efekti CSS), "PADEL **LEGENDS**" logosu açılır, altında "MESUT PADEL". Her tuş / tık / kol tuşu atlar. Oturumda yalnız ilk açılışta (`sessionStorage`, try/catch). `prefers-reduced-motion` → animasyonsuz logo ~1 sn. Splash `main.js`'in yüklenmesini **beklemez/engellemez**. Ses yok (tarayıcı kullanıcı etkileşimi olmadan ses çalmaz).
2. **HOME** (`src/home.js`, yeni `#home` paneli): 3 büyük kart + alt satır, metinler şartname §5.3'teki gibi (İngilizce).
   - FRIENDLY MATCH → mevcut sihirbazı açar (`#menu`).
   - CAREER → `openCareer()`; profil varsa alt yazı "Continue — <name>" (`loadProfile(localStorage)`, `src/career.js`).
   - FRIENDS CUP → kart görünür ama pasif: "Needs an online server — coming soon". Tıklanınca kısa açıklama, başka bir şey yapmaz.
   - Alt satır: Training (bugünkü eğitim yolu), Settings, Controls (mevcut kol yardım paneli `#help` / `helpkeys.js`), Profile (yalnız kariyer profili varsa → kariyer Profile ekranı).
   - Kol: ←/→/↑/↓ `spatialFocus`, A/✕ tıklar; klavye ok tuşları + Enter. Odaklanan kart belirgin.
3. **Friendly sihirbazı** (`src/menu.js`): Mode adımının başına **Where?** seçimi: `On this computer` / `Online with a friend`. Online seçilince mevcut çekmece içeriği burada açılır; **Create room** sonrası kodu ve `?room=CODE` linkini Kopyala düğmesiyle göster. `#pl-career-btn` ve `#pl-tutorial-btn` sihirbazdan kalkar (HOME'da). Mode adımında B/Esc ve tarayıcı Geri → HOME.
4. **Settings** (`src/settings.js` saf mantık + HOME'dan açılan küçük panel): `padel.settings.v1` = `{ control: 'auto'|'kb'|'pad', speed: 0.7|0.85|1 }`; okuma/yazma try/catch, bozuk/eksikse varsayılan. Sihirbazın Controls / Game speed seçimi buradan okur ve buraya yazar; **kariyer maçları da buradan okur** (careerui'de maç başlatırken — bilinen hatayı kapatır).
5. **Rotalar** (`src/route.js` saf: `parseRoute(hash, search)` → `{screen: 'home'|'friendly'|'career', room?}`): `#home`, `#friendly`, `#career`; tarayıcı Geri/İleri çalışır. `?room=CODE` → splash sonrası Friendly → Online, kod dolu. Maç bitince `toMenu()` maçın başladığı yere döner (Friendly → `#friendly`, kariyer → `#career` zaten böyle). `closeCareer()` artık HOME'a döner.

6. **PlayStation kolu** (DualShock 4 / DualSense): tuş numaraları Xbox ile aynı ("standard" düzen), yani `padDir`/`spatialFocus` ve 0=onay, 1=geri, 9=Start her iki kolda çalışır. Fark yalnız yazılarda: splash, HOME, Settings ve sihirbazdaki **her kol ipucu** Xbox adlarıyla yazılıp `padText()` (`src/padstyle.js`) içinden geçirilsin → PS kolda "✕ select · ○ back · Options", Xbox'ta "A select · B back · Start". Settings'te kontrol seçeneği "Xbox controller only" değil "Controller only" (Xbox / PlayStation). Kol takıldığında (`gamepadconnected`) ipuçları yeniden çizilsin.

## Testler (`npm test` yeşil)
- `test/route.test.js`: `#home`, `#friendly`, `#career`, boş hash → home, `?room=padel1` → `PADEL1` (büyük harf, yalnız A-Z0-9, en çok 6), bilinmeyen → home.
- `test/settings.test.js`: storage atınca (throw) varsayılan döner; geçersiz `speed` → varsayılan; kayıt/okuma tur testi.

## Doğrulama (raporda dürüst yaz)
- `npm test` ve `npx vite build` çıktısı.
- Elle kontrol listesi (yaptıklarını ✔, yapamadıklarını ✘ ile): PS kol bağlıyken ipuçları ✕ ○ Options gösteriyor; splash atlanıyor ve ikinci yüklemede çıkmıyor; HOME'da kol ile 3 kart + alt satır gezilebiliyor; Friendly → START maç açıyor; maç sonu Friendly'ye dönüyor; Career aç/kapa HOME'a dönüyor; tarayıcı Geri; `?room=ABC123`. Görsel doğrulama yapamadıysan "yapamadım" yaz — Opus tarayıcıda bakacak.
