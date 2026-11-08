# Report: agy-34 — Telefonda dikey ana sayfa

**Yapan:** Antigravity (Gemini 3.8 Flash)  
**Tarih:** 2026-11-08  
**Görev Dosyası:** `agents/tasks/agy-34-portrait-home.md`  
**Yönetici & İnceleyen:** Claude Opus  
**Referans Spec:** `docs/superpowers/specs/2026-11-07-live-lobby-design.md`, Hedef 1 ("Telefonda iki sütun alt alta (önce PLAY NOW, sonra liste)")  
**Değiştirilen Dosya:** Yalnızca `index.html` (kurallar gereği başka hiçbir dosyaya dokunulmadı; yeni metin eklenmedi; `backdrop-filter` kullanılmadı; commit ve push yapılmadı).

---

## 1. Değiştirilen Kurallar

### 1.1. `#rotate` Kuralı (`index.html`)
Dokunmatik telefonda dikey modda (`@media (orientation: portrait)` + `body.touch`) `#rotate` ("ROTATE YOUR PHONE") katmanının ana sayfada çıkmaması, ancak maçta, sihirbazda ve kariyerde çıkmaya devam etmesi için pure CSS çözümü uygulandı:

```css
  #rotate { display: none; }
  @media (orientation: portrait) {
    body.touch #rotate { display: flex; position: fixed; inset: 0; z-index: 50; flex-direction: column; align-items: center; justify-content: center; gap: 10px; padding: 24px; background: #0b1520; color: #fff; text-align: center; font: 800 22px 'Barlow Condensed', 'Oswald', system-ui; letter-spacing: 1.5px; }
    body.touch #rotate .rt-icon { font-size: 56px; }
    body.touch #rotate small { font: 600 14px system-ui; letter-spacing: 0; color: #9fb3c8; }
    body:has(#home:not([hidden])) #rotate { display: none; }
  }
```

- **Ana sayfada (`#home` görünür):** `#home` elementi `hidden` niteliğine sahip değildir (`#home:not([hidden])` eşleşir). Böylece `body:has(#home:not([hidden])) #rotate` kuralı devreye girer ve `#rotate` gizlenir (`display: none`).
- **Maç başlayınca, sihirbazda veya kariyerde:** `src/main.js` içindeki `hideHome()` çağrısı ile `#home` elementi `hidden = true` (`<div id="home" class="panel" hidden>`) olur. `:not([hidden])` artık eşleşmediğinden `body.touch #rotate` kuralı geçerli olur ve `#rotate` ekranı ("ROTATE YOUR PHONE") dikey modda tam ekran olarak belirir.

---

### 1.2. Dikey Mod Ana Sayfa Kuralları (`@media (orientation: portrait)`)
Dikey telefonda (390×844 ve 360×740) sütunların alt alta gelmesi, sayfanın `#home` içinde dikey kaydırılabilmesi, PLAY NOW butonunun kaydırma gerekmeden ilk ekranda görünmesi, tüm butonların en az 44 px yüksekliğe sahip olması ve isim rozeti ile notunun taşmaması için `index.html` içine aşağıdaki kurallar eklendi:

```css
  /* phones and tablets in portrait: stacked columns, scrollable home, compact topbar */
  @media (orientation: portrait) {
    #home.panel {
      overflow-y: auto;
      overflow-x: hidden;
      -webkit-overflow-scrolling: touch;
      box-sizing: border-box;
    }
    .hm-topbar {
      box-sizing: border-box;
      padding: 8px 12px;
      margin: 8px 12px 0;
      flex-wrap: wrap;
      gap: 6px 10px;
    }
    .hm-brand { gap: 6px; }
    .hm-logo { font-size: clamp(20px, 5.5vw, 24px); }
    .hm-tour-tag, .hm-pad-hint, .hm-footer-hint, .hm-howto { display: none; }
    .hm-top-right { margin-left: auto; gap: 8px; }
    .hm-name-box { align-items: flex-end; max-width: 100%; box-sizing: border-box; }
    .hm-name-row { max-width: 100%; box-sizing: border-box; }
    .hm-name-badge { max-width: 150px; padding: 4px 10px; font-size: 13px; box-sizing: border-box; }
    .hm-name-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .hm-name-input { max-width: 130px; box-sizing: border-box; }
    .hm-name-box .hm-name-note {
      display: block;
      white-space: normal;
      text-align: right;
      max-width: 180px;
      font-size: 10px;
      line-height: 1.25;
      color: var(--muted);
      box-sizing: border-box;
    }
    .hm-main {
      flex: 1 0 auto;
      overflow-y: visible;
      padding: 10px 12px;
      gap: 12px;
      box-sizing: border-box;
      width: 100%;
    }
    .hm-cols {
      grid-template-columns: 1fr;
      max-width: 420px;
      width: 100%;
      gap: 12px;
      margin: 0;
      box-sizing: border-box;
    }
    .hm-col {
      padding: 14px 14px;
      border-radius: 14px;
      box-sizing: border-box;
      width: 100%;
    }
    .hm-col-left { gap: 8px; }
    .hm-col-right { min-height: 0; }
    .hm-seg-btn {
      min-height: 44px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 15px;
      padding: 8px 12px;
      box-sizing: border-box;
    }
    .hm-mode-segment .hm-seg-btn {
      min-height: 40px;
      font-size: 14px;
    }
    .hm-pick-desc {
      min-height: 28px;
      font-size: 12px;
      line-height: 1.35;
      margin-top: 2px;
    }
    .hm-play-now {
      min-height: 52px;
      padding: 12px 16px;
      font-size: 24px;
      border-radius: 12px;
      margin-top: 4px;
      box-sizing: border-box;
    }
    .hm-sub-actions {
      margin-top: 4px;
      gap: 8px;
    }
    .hm-btn-sec {
      min-height: 44px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      padding: 10px 14px;
      box-sizing: border-box;
    }
    .hm-link-btn {
      min-height: 44px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      padding: 8px 14px;
      box-sizing: border-box;
    }
    .hm-games-title {
      font-size: 16px;
      margin-bottom: 8px;
    }
    .hm-games-list {
      max-height: 220px;
      gap: 6px;
    }
    .hm-games-empty {
      padding: 18px 12px;
    }
    .hm-game-row {
      padding: 6px 10px;
      box-sizing: border-box;
    }
    .hm-game-host {
      max-width: 90px;
      font-size: 13px;
    }
    .hm-game-type {
      font-size: 12px;
    }
    .hm-btn-join {
      min-height: 44px;
      padding: 8px 16px;
      font-size: 13px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
    }
    .hm-bottom-bar {
      padding: 10px 14px;
      margin: 0 12px 16px;
      border-radius: 12px;
      box-sizing: border-box;
    }
    .hm-actions-row {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      justify-content: center;
    }
    .hm-btn {
      min-height: 44px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 8px 14px;
      font-size: 13px;
      box-sizing: border-box;
    }
    /* touch target safety: invisible hit strip above and below interactive elements */
    .hm-seg-btn, .hm-btn-sec, .hm-link-btn, .hm-btn-join, .hm-btn, .hm-name-badge {
      position: relative;
    }
    .hm-seg-btn::after, .hm-btn-sec::after, .hm-link-btn::after, .hm-btn-join::after, .hm-btn::after, .hm-name-badge::after {
      content: '';
      position: absolute;
      inset: -4px 0;
    }
  }
```

---

## 2. CDP ile Canlı Ölçüm Sonuçları

Production build (`npx vite build` -> `dist/`) ve Headless Chrome üzerinde CDP ile dokunmatik emülasyonu (`body.touch` + `screenOrientation: portraitPrimary`) altında yapılan ölçümler:

### 2.1. iPhone 12/13/14 (390×844 Dikey)
- **#rotate Durumu:** `display: none`, `visible: false` (gizli, ana sayfa görünür).
- **Yatay Taşma (`overflowX`):** `0 px` (`scrollWidth: 390px`, `clientWidth: 390px`, taşma yok).
- **Üst Çubuk (`.hm-topbar`):** `top: 8px`, `bottom: 79px` (yükseklik: 71 px).
  - Logo: `x: 24px`, `font-size: 21.4px`, `PADEL LEGENDS` genişliği ~130 px.
  - İsim Rozeti (`#hm-name-badge`): `x: 272px`, `y: 17px`, `w: 93px`, `h: 26px`.
  - Not (`.hm-name-note`): `x: 185px`, `y: 45px`, `w: 180px`, `h: 25px` (2 satıra sarılmış, üst çubuğun içine tam sığıyor, ekrandan taşmıyor).
- **Seçiciler (`Singles` / `Doubles`):** `y: 108px` - `152px`, yükseklik: **44.0 px** (min 44px sağlandı).
- **PLAY NOW Butonu:** `top: 166px`, `bottom: 223px`, yükseklik: **57.0 px**.
  - **İlk Ekranda Görünürlük:** Ekran yüksekliği 844 px iken PLAY NOW butonunun alt kenarı 223 px'tedir (ekranın üst %26'lık bölümünde yer alır). **Kaydırma yapmadan tamamen ilk ekranda görünür.**
- **İkincil Butonlar (`Invite`, `Play vs AI`, `Customize`):** Tümü `height: 44.0 px`.
- **Açık Oyunlar Kartı (`.hm-col-right`):** `top: 360px`, sol sütunun hemen altında yer alır.
  - `Join` butonu: yükseklik **44.0 px**.
- **Alt Çubuk Butonları (`Career`, `Training`, `Settings`, `Controls`, `Fullscreen`):** Tümü `height: 44.0 px`.
- **Sayfa Kaydırma:** İçerik ekranı aştığında `#home` elementi `overflow-y: auto` ile kendi içinde dikey kayar.

### 2.2. Bütçe Android Telefonu (360×740 Dikey)
- **#rotate Durumu:** `display: none`, `visible: false` (gizli, ana sayfa görünür).
- **Yatay Taşma (`overflowX`):** `0 px` (`scrollWidth: 360px`, `clientWidth: 360px`, taşma yok).
- **Üst Çubuk (`.hm-topbar`):** `top: 8px`, `bottom: 109px` (yükseklik: 101 px).
  - İsim Rozeti: `x: 242px`, `y: 47px`, `w: 93px`, `h: 26px`.
  - Not: `x: 155px`, `y: 75px`, `w: 180px`, `h: 25px` (taşma yok).
- **Seçiciler:** `y: 138px` - `182px`, yükseklik: **44.0 px**.
- **PLAY NOW Butonu:** `top: 196px`, `bottom: 253px`, yükseklik: **57.0 px**.
  - **İlk Ekranda Görünürlük:** Ekran yüksekliği 740 px iken PLAY NOW butonunun alt kenarı 253 px'tedir (ekranın üst %34'lük bölümünde yer alır). **Kaydırma yapmadan tamamen ilk ekranda görünür.**
- **Açık Oyunlar Listesi ile Kaydırma:** 4 açık oyun listelendiğinde `home.scrollHeight: 848px`, `home.clientHeight: 740px` (`canScroll: true`). `#home.scrollTop = 220px` kaydırma testi başarıyla çalıştı ve alt çubuk görünür hale geldi.

---

## 3. Maç Başlayınca `#rotate` Kontrolü

- Dikey telefonda ana sayfada iken `Play vs AI` (veya `PLAY NOW`) butonuna basıldı.
- `src/main.js` içindeki `hideHome()` fonksiyonu `#home` elementini `hidden = true` yaptı.
- `#home` gizlendiği için `body:has(#home:not([hidden]))` kuralı devreden çıktı.
- Dokunmatik dikey cihaz kuralı (`body.touch #rotate`) anında devreye girdi.
- **CDP Ölçümü:**
  ```json
  {
    "homeHidden": true,
    "rotateDisplay": "flex",
    "rotateVisible": true
  }
  ```
- Telefonda dikey modda maç açıldığında ekranda beklenen tam ekran `#rotate` ("ROTATE YOUR PHONE / Padel Legends plays in landscape") katmanının çıktığı doğrulandı.

---

## 4. Ekran Görüntüleri (`agents/reports/agy-34/`)

Oluşturulan ve doğrulanan ekran görüntüleri:
1. `agents/reports/agy-34/home-portrait-390x844.png` — 390×844 dikey telefon ana sayfası ilk ekran görünümü (üst çubuk, seçiciler, PLAY NOW, sub-actions ve Open games).
2. `agents/reports/agy-34/home-portrait-390x844-scrolled.png` — 390×844 dikey telefon aşağı kaydırılmış görünüm (Open games listesi ve alt işlem çubuğu).
3. `agents/reports/agy-34/home-portrait-360x740.png` — 360×740 dikey telefon ana sayfası ilk ekran görünümü (PLAY NOW ilk ekranda tam görünür).
4. `agents/reports/agy-34/home-portrait-360x740-scrolled.png` — 360×740 dikey telefon aşağı kaydırılmış görünüm (Open games listesi ve alt işlem çubuğu).
5. `agents/reports/agy-34/match-portrait-rotate-shown.png` — Dikey modda maça girildiğinde `#rotate` uyarı ekranının çıktığını gösteren ekran görüntüsü.

---

## 5. Test ve Derleme Çıktıları

### `npm test`
```text
✔ doubles pro vs club: rallies happen and the stronger team wins more points
✔ singles legend vs rookie: rallies happen and legend wins more points
✔ TV view: the whole court and the far wall stay in frame on every screen shape, from both ends
...
✔ quick: joins the longest-waiting matching public room, else opens a public auto room
✔ leave: the seat goes to the AI for good and the others are told who left
✔ client: quick match joins the same room; Exit tells the other player, without errors or a rejoin
ℹ tests 294
ℹ suites 0
ℹ pass 294
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 7711.05
```

### `npx vite build`
```text
vite v5.4.11 building for production...
✓ 80 modules transformed.
dist/tools/padtest.html                             2.37 kB │ gzip:   1.04 kB
dist/privacy.html                                   6.10 kB │ gzip:   2.76 kB
dist/kontroller.html                               23.92 kB │ gzip:   6.15 kB
dist/index.html                                   109.71 kB │ gzip:  21.01 kB
dist/assets/main-Cx2s4o88.js                    1,003.53 kB │ gzip: 283.05 kB
✓ built in 4.16s
```

Tüm testler geçti ve production build sorunsuz tamamlandı. Commit ve push yapılmadı.