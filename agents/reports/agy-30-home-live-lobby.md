# agy-30 — Ana sayfa = canlı lobi (görsel düzen) Raporu

**Yapan:** Antigravity (Gemini 3.8 Flash)  
**Tarih:** 2026-11-08  
**Görev Dosyası:** `agents/tasks/agy-30-home-live-lobby.md`  
**Yönetici & İnceleyen:** Claude Opus  
**Dal:** `main` (commit ya da push yapılmadı)

---

## 1. Özet ve Uygulanan Düzen (Taslak B)

Ana sayfa (`#home`) tek ekranlık modern ve hızlı canlı lobi düzenine (Taslak B) dönüştürüldü:

1. **Sol Sütun (Maç Yapılandırması ve PLAY NOW):**
   - Üstte kalıcı seçici `[Singles | Doubles]`.
   - `Doubles` seçildiğinde altında ikinci kalıcı seçici `[Team up | Face off]` ve açıklama metinleri (`Empty seats are played by the AI.`; `You and another player vs two AI players.`; `You against another player, each with an AI partner.`).
   - Seçim `localStorage` `padel.quick.v1` (`{ players: 2|4, mode: 'team'|'face' }`) içinde saklanır ve hatırlanır (okunamazsa güvenli bir şekilde `Singles` / `{ players: 2, mode: 'team' }` varsayılanına döner).
   - Altında büyük koyu zeminli (`#0f172a`), limon sarı/yeşil (`#d8f53a`) metinli **PLAY NOW** butonu (sayfadaki tek limon renkli öğe).
   - Onun altında ikincil butonlar: **Invite a friend**, **Play vs AI** ve yanında küçük **Customize** butonu (mevcut Friendly sihirbazı).

2. **Sağ Sütun (Open Games):**
   - Başlıkta `Open games` ve hafif animasyonlu canlı yeşil nokta (`.hm-live-dot`).
   - Canlı maç satırları: Karakterin bayrağı (`src/flags.js` vektörel çizimi `characters[char]?.countryCode` üzerinden), takma ad, tür (`Singles 1/2`, `Doubles · Team up 1/2`, `Doubles · Face off 2/4`) ve sağda **Join** butonu.
   - Boş liste durumu: `Nobody is waiting right now — be the first.`
   - Sunucu kapalı durumu (`serverReady === false`): `Online play is not open yet.` (PLAY NOW ve Invite a friend butonları pasif yapılmaz, tıklanabilir kalır).
   - Satırdaki tüm ad ve oda kodları XSS koruması için kesin olarak kaçışlanır (`escapeHtml`).

3. **Sağ Üstte İsim Rozeti:**
   - `Player 4821 ✎` rozeti. Dokununca yerinde `<input maxlength="16">` açılarak düzenlenir, blur/Enter ile kaydedilir, Escape ile iptal edilir.
   - Değer `localStorage` `padel.onlineName` içinde saklanır. Boşsa ilk açılışta `Player ` + 4 rastgele rakam üretilip kaydedilir.
   - Yanında küçük not: `Visible to other players — don't use your real name.` (küçük mobil ekranlarda gizlenerek alan tasarrufu sağlanır).

4. **Alt Çubuk (Bağlantılar) & HOWTO:**
   - Eski "SELECT GAME MODE" ve "Friends Cup" kartları tamamen kaldırıldı.
   - Alt çubukta küçük butonlar: `🏆 Career`, `🎓 Training`, `⚙️ Settings`, `⌨️ Controls`, `⛶ Fullscreen`, `👤 Profile` (profil varsa), `Privacy`, `✉ contact@padellegends.eu` ve gamepad tuş ipucu.
   - `HOWTO` resimleri sayfanın altında kompakt küçük kartlar olarak korundu.

5. **Duyarlı Tasarım (Mobil & Kumanda):**
   - Dikey telefonda iki sütun alt alta gelir; önce sol sütun (PLAY NOW), ardından sağ sütun (Open games) yerleşir.
   - Yatay telefonda (yükseklik < 500 px) iki sütun yan yana, çubuklar ince ve kompakt tutularak PLAY NOW kaydırmaya gerek kalmadan tam görünürlükte kalır.
   - Kumanda: `spatialFocus` ve `padDir` ile tüm butonlar (seçiciler, PLAY NOW, ikincil butonlar, Join butonları, isim rozeti, alt çubuk) D-pad/sol analog ile odaklanabilir; A tuşu tıklar.

---

## 2. Değişen Dosyalar ve Dışa Açılan Fonksiyonlar

### Değişen Dosyalar
1. `src/home.js` — Canlı lobi bileşeni yeniden yazıldı.
2. `index.html` — `#home` ve `.hm-*` CSS kuralları açık renk tema değişkenleriyle yenilendi (HD 620 kuralına uygun: `backdrop-filter` yok, animasyonlar yalnızca `transform`/`opacity`).
3. `src/main.js` — `initHome` çağrısında `onFriendly` -> `onCustomize` yapıldı; `onPlayNow`, `onInvite`, `onJoin`, `onPlayAI` boş geri çağırmaları eklendi (başka satıra dokunulmadı).
4. `src/locales/{de,es,fr,it,nl,pt,tr}.js` — 14 yeni UI metni eklendi, 17 kullanılmayan eski HOME anahtarı temizlendi.
5. `data/i18n-keys.json` — `node tools/extract-keys.js` çalıştırılarak güncellendi (1039 anahtar).
6. `test/home.test.js` — `home.js` birim testleri oluşturuldu (8 test).

### `src/home.js` Dışa Açılan Fonksiyonlar
```javascript
export function initHome(cbs = {})
export function setOpenGames(rows, serverReady = true)  // rows: [{ code, players, mode, free, host, char }]
export function getOnlineName()                         // rozetteki takma ad
export function getQuickPick()                          // { players, mode }
export function showHome()
export function hideHome()
export function refreshHomeHints()
export function renderHome()
```

*(Not: `src/game.js`, `src/physics.js`, `src/rules.js`, `src/ai.js`, `server/` ve `src/net.js` dosyalarına kesinlikle dokunulmamıştır.)*

---

## 3. Ekran Görüntüleri

Ekran görüntüleri Google Chrome Headless (`--allow-file-access-from-files --window-size=...`) ile `agents/reports/agy-30/` dizinine kaydedilmiştir:

- Masaüstü (1280x800): `agents/reports/agy-30/desktop.png`
- Dikey Telefon (390x844): `agents/reports/agy-30/mobile-portrait.png`
- Yatay Telefon (844x390, yükseklik < 500 px): `agents/reports/agy-30/mobile-landscape.png`

---

## 4. Test ve Derleme Çıktıları

### `npm test`
```
ℹ tests 292
ℹ suites 0
ℹ pass 292
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 8133.012878
```
Tüm 292 birim ve entegrasyon testi (8 yeni `test/home.test.js` testi ve 7 dil tablosunu doğrulayan `test/i18n-keys.test.js` dahil) eksiksiz geçti.

### `npx vite build`
```
dist/tools/padtest.html                           2.37 kB │ gzip:   1.04 kB
dist/privacy.html                                 5.98 kB │ gzip:   2.70 kB
dist/kontroller.html                             23.92 kB │ gzip:   6.15 kB
dist/index.html                                 104.69 kB │ gzip:  20.21 kB
dist/assets/modulepreload-polyfill-B5Qt9EMX.js    0.71 kB │ gzip:   0.40 kB
dist/assets/main-BaRw2SnU.js                      0.83 kB │ gzip:   0.49 kB
dist/assets/padtest-B953dsqX.js                   2.20 kB │ gzip:   1.16 kB
dist/assets/input-CbguLTEv.js                     2.45 kB │ gzip:   1.18 kB
dist/assets/i18n-CrbCjZVj.js                      3.05 kB │ gzip:   1.50 kB
dist/assets/controls-mWwJakje.js                  3.57 kB │ gzip:   1.77 kB
dist/assets/helpkeys-DQR4stSE.js                  9.47 kB │ gzip:   4.21 kB
dist/assets/tr-MLpAZMCv.js                       58.38 kB │ gzip:  24.95 kB
dist/assets/nl-DeLfUqOR.js                       60.59 kB │ gzip:  23.95 kB
dist/assets/pt-elzS95rh.js                       61.52 kB │ gzip:  24.70 kB
dist/assets/de-B0mKMgsO.js                       61.59 kB │ gzip:  24.89 kB
dist/assets/it-aU3P2S_h.js                       61.75 kB │ gzip:  24.36 kB
dist/assets/es-8pAILF-s.js                       62.01 kB │ gzip:  24.89 kB
dist/assets/fr-W0zQ44oK.js                       62.58 kB │ gzip:  24.84 kB
dist/assets/main-DZWRl2kS.js                    998.34 kB │ gzip: 281.41 kB
✓ built in 4.52s
```
Production derlemesi sıfır hata ile tamamlandı.
