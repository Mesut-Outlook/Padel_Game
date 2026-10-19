# Görev agy-17 Raporu: Pause yalnızca Esc + tüm oyuncuların enerji çubukları

**Tarih:** 2026-10-18  
**Ajan:** Antigravity (Gemini 3.8 Flash)  
**Reviewer:** Claude Opus  

---

## 1. Değişiklik Özeti

Kullanıcı talebi doğrultusunda klavyede `P` tuşunun duraklatma (pause) ataması kaldırıldı ve yalnızca `Escape` (veya Gamepad `Start` / klavye `Pause`) ile duraklatma sağlandı. Ayrıca tam ekranda `Escape` tuşunun tarayıcı tarafından doğrudan yutulmasını engellemek için `navigator.keyboard.lock(['Escape'])` ve çıkışta `unlock()` entegrasyonu yapıldı.

Skor tablosundaki `#hudEnergy` bileşeni tekli maçta 2 oyuncuyu (1 satır, 2 sütun), çiftler maçında 4 oyuncuyu (2 satır, 2 sütun; sol sütun Takım 0, sağ sütun Takım 1) gösterecek şekilde yeniden yapılandırıldı. Yerel insan oyuncuların isimleri vurgulanırken, AI oyuncular normal gösterildi. İzleme modunda da çubukların görünmesi sağlandı.

---

## 2. Değiştirilen Dosyalar ve Detaylar

1. **`src/main.js`**:
   - `renderEnergy(view)`:
     - Aktif oyuncu tespiti: Tekler için `[0, 2]`, çiftler için `[0, 2, 1, 3]`.
     - Sıralama 2 sütunlu grid ile sol sütunda Takım 0 (`0`, `1`), sağ sütunda Takım 1 (`2`, `3`) oyuncularını dizecek biçimde kuruldu.
     - İsim kuralı: `avatars[id]?.ch?.name?.split(' ').pop() || ('P' + (id + 1))`.
     - İnsan oyunculara `.human` sınıfı eklendi (accent renk ve kalın yazı).
     - `box.hidden = false` yapılarak izleme modu (0 insan) da desteklendi.
     - Yorgunluk uyarısı (`😮‍💨 TIRED`) yalnızca ilk yerel insan oyuncu (`humans[0]`) için sınırlandırıldı.
     - DOM churn önleme: `box.innerHTML` yalnızca oyuncu kimlikleri veya isimleri değiştiğinde (`energyUi?.key !== key`) güncellenir; kare bazında yalnızca `style.width` ve `className` güncellenir.
   - `pauseItems()` / `drawPause()`:
     - İpucu metni: `padText('↑ ↓ / Left Stick select · Enter / A confirm · Esc / Start resume')`.
   - `pauseInput()`:
     - `back`: `KeyP` kaldırıldı; `consumePressed('Escape') | consumePressed('Pause') | padBack`.
   - `loop(now)`:
     - Maç döngüsü duraklatma tetikleyicisi: `consumePressed('Pause') | (!replay.playing && consumePressed('Escape'))` (`KeyP` kaldırıldı).
     - Maç sonu skor ekranı yorumu ve davranışı Esc ile güncellendi.

2. **`src/fullscreen.js`**:
   - `toggleFullscreen`:
     - Tam ekrana girerken: `try { await nav?.keyboard?.lock?.(['Escape']); } catch {}`.
     - Tam ekrandan çıkarken: `try { nav?.keyboard?.unlock?.(); } catch {}`.
   - `bindFullscreenKey`:
     - `onFsChange` olayında tam ekrandan çıkıldığında `unlock()` çağrısı garantilendi.

3. **`test/fullscreen.test.js`**:
   - `toggleFullscreen locks Escape on enter and unlocks on exit` testi eklendi:
     - Sahte `navigator.keyboard.lock` ve `unlock` metotlarıyla tam ekrana girişte `['Escape']` kilitlendiği, çıkışta `unlock()` çağrıldığı doğrulandı.

4. **`src/helpkeys.js`**:
   - `K` sözlüğünden `KeyP: ['P', 'sys', 'pause']` girdisi kaldırıldı (klavye düzeninde P tuşu etiketsiz kaldı).
   - `.hk-foot`: `<b>P</b> / <b>Esc</b>: pause` → `<b>Esc</b>: pause`.

5. **`public/kontroller.html`**:
   - System tablosunda: `<kbd>P</kbd> / <kbd>Esc</kbd>` satırı `<kbd>Esc</kbd>` olarak güncellendi.

6. **`index.html`**:
   - `#pause .pz-hint`: `P / Esc / Start` → `Esc / Start`.
   - `#hud .hud-energy`: İki sütunlu grid yapısı (`grid-template-columns: 1fr 1fr; gap: 3px 12px;`).
   - `#hud .he-row`: `grid-template-columns: auto 1fr; gap: 6px; font-size: 10px; min-width: 0;`.
   - `#hud .he-row.human`: `color: #fff; font-weight: 800;` ve `.he-name { color: var(--acc); }`.
   - `#hud .he-row .he-name`: `max-width: 72px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;`.
   - `#hud .he-bar`: `height: 5px; min-width: 32px;`.
   - `#hypeToast`: `top: max(185px, 24%)` olarak güncellendi.

---

## 3. Çakışma ve Ölçüm Değerleri (`getBoundingClientRect`)

Headless Chromium ortamında çiftler maçı (3 setli skor tablosu + 4 oyuncu enerjisi) senaryosunda 1280x720 çözünürlükte `getBoundingClientRect` ile ölçülen değerler:

- **Eski CSS (`#hypeToast { top: max(150px, 22%) }`):**
  - Viewport yüksekliği: `720px` → `22% of 720 = 158.4px`
  - `#hud` `bottom`: `171px`
  - `#hypeToast` `top`: `158.4px`
  - **Fark (Gap):** `158.4px - 171px = -12.6px` (12.6 piksel **çakışma** / üst üste binme vardı).

- **Yeni CSS (`#hypeToast { top: max(185px, 24%) }`):**
  - Viewport yüksekliği: `720px` → `24% of 720 = 172.8px`, `max(185px, 172.8px) = 185px`
  - `#hud` `bottom`: `171px` (`x: 464.84, y: 10, width: 350.33, height: 161, top: 10, bottom: 171`)
  - `#hypeToast` `top`: `185px` (`x: 484.80, y: 185, width: 310.39, height: 32, top: 185, bottom: 217`)
  - **Fark (Gap):** `185px - 171px = 14px`
  - İstenen şart: Skor tablosunun alt kenarı, bildirimin üst kenarından **en az 8 px yukarıda** kalmalı (`14px >= 8px` koşulu tam olarak sağlandı).

---

## 4. Test ve Build Çıktıları

### `npm test`
```
ℹ tests 114
ℹ suites 0
ℹ pass 114
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2674.722692
```

### `npx vite build`
```
dist/tools/padtest.html            2.27 kB │ gzip:   1.02 kB
dist/index.html                   77.62 kB │ gzip:  15.05 kB
dist/assets/padtest-Dhox92Zh.js    2.15 kB │ gzip:   1.13 kB
dist/assets/input-DXnjCvpv.js      2.73 kB │ gzip:   1.31 kB
dist/assets/main-BsUqKSIZ.js     910.11 kB │ gzip: 252.41 kB
✓ built in 3.59s
```
