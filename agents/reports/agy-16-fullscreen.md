# Görev agy-16: Tam Ekran (Fullscreen) Geçiş Düğmesi ve 'F' / 'F11' Kısayolu

**Ajan:** Antigravity (agy)  
**Yönetici / Reviewer:** Claude Opus  
**Tarih:** 2026-10-18  
**Durum:** Tamamlandı, Opus incelemesine hazır. (Commit atılmadı)  

---

## 1. Genel Bakış ve Yapılan Değişiklikler

Kullanıcının *"bundan sora ekrani full ekran yapacak tus ekle... bunu da is listesine ekle.."* talimatı doğrultusunda oyunun her aşamasında (HOME, sihirbaz, maç içi ve duraklatma menüsü) tek tıkla veya klavye kısayoluyla tam ekrana geçilmesini sağlayan altyapı geliştirildi:

1. **`src/fullscreen.js` Modülü:**
   - `isFullscreen(doc)`: Standart ve önekli (`webkit`, `moz`, `ms`) Fullscreen API'yi kontrol eder.
   - `toggleFullscreen(target, doc)`: Tam ekrana girer ya da çıkar; tarayıcı izin hatalarını try/catch ile güvenle yakalar.
   - `bindFullscreenKey(target, doc)`: Global `KeyF` tuş dinleyicisini bağlar. Kullanıcı `INPUT`, `TEXTAREA` veya `SELECT` içindeyken (örneğin oda kodu veya karakter ismi yazarken) 'F' tuşunun tam ekranı tetiklemesini engeller.
   - `updateFullscreenButtons(doc)`: `fullscreenchange` olayı tetiklendiğinde ekrandaki tüm tam ekran butonlarının ikonunu (`⛶` / `🗗`) ve metnini ("Fullscreen" / "Exit Fullscreen") dinamik senkronize eder.

2. **Ekran Butonları (UI):**
   - **HOME Ekranı ([`src/home.js`](file:///home/mesuto/Documents/PROJELER/Padel_Game/src/home.js)):** Alt buton çubuğuna `#hm-btn-fullscreen` ("⛶ Fullscreen") butonu eklendi.
   - **Hazırlık Maçı Sihirbazı ([`src/menu.js`](file:///home/mesuto/Documents/PROJELER/Padel_Game/src/menu.js)):** Üst çubukta `← HOME` butonunun yanına `#pl-fs-btn` ("⛶") butonu yerleştirildi.
   - **Maç İçi HUD ([`index.html`](file:///home/mesuto/Documents/PROJELER/Padel_Game/index.html), [`src/main.js`](file:///home/mesuto/Documents/PROJELER/Padel_Game/src/main.js)):** Sağ alttaki `#cam` kamerasının hemen üzerine `#fsBtn` ("⛶") butonu eklendi ve `setupScene` sırasında görünür kılındı.
   - **Duraklatma Menüsü (Pause) ([`src/main.js`](file:///home/mesuto/Documents/PROJELER/Padel_Game/src/main.js)):** Duraklatma menüsü seçenekleri arasına "Fullscreen (F)" / "Exit Fullscreen" seçeneği eklendi.

3. **Kısayol ve Dokümantasyon:**
   - `F` ve `F11` tuşları tam ekranı tetikler.
   - [`public/kontroller.html`](file:///home/mesuto/Documents/PROJELER/Padel_Game/public/kontroller.html) dokümantasyonuna ve [`src/helpkeys.js`](file:///home/mesuto/Documents/PROJELER/Padel_Game/src/helpkeys.js) maç içi tuş yardım paneline `F` kısayolu işlendi.

---

## 2. Test Sonuçları

`test/fullscreen.test.js` altında 4 birim testi yazıldı ve çalıştırıldı:
- `isFullscreen` tespiti ve yokluk durumu.
- `toggleFullscreen` giriş/çıkış geçişleri.
- `bindFullscreenKey` input filtreleme ve normal tetikleme testi.
- `updateFullscreenButtons` ikon ve etiket senkronizasyon testi.

```bash
npm test
```
**Sonuç:**
```
✔ isFullscreen detects fullscreen elements or absence (1.058887ms)
✔ toggleFullscreen enters fullscreen when not active and exits when active (0.389879ms)
✔ bindFullscreenKey triggers on KeyF when not inside an input field (0.45826ms)
✔ updateFullscreenButtons updates label and icon based on fullscreen state
...
ℹ tests 94
ℹ suites 0
ℹ pass 94
ℹ fail 0
```

```bash
npx vite build
```
**Sonuç:**
```
✓ built in 3.19s (dist dosyaları temiz ve hatasız üretildi)
```

---

## 3. Değiştirilen ve Eklenen Dosyalar

- `src/fullscreen.js` (Yeni modül)
- `test/fullscreen.test.js` (Yeni birim testleri)
- `agents/tasks/agy-16-fullscreen.md` (Yeni görev şartnamesi)
- `agents/reports/agy-16-fullscreen.md` (Bu rapor)
- `index.html` (CSS ve `#fsBtn` HUD butonu)
- `src/home.js` (Alt çubuğa `#hm-btn-fullscreen` entegrasyonu)
- `src/menu.js` (Üst çubuğa `#pl-fs-btn` entegrasyonu)
- `src/main.js` (Global key binding, setupScene fsBtn gösterimi, pause menüsü seçeneği)
- `src/helpkeys.js` (Ekran altı yardım metnine `F: Fullscreen` eklemesi)
- `public/kontroller.html` (Kamera & Sistem tablosuna `F` eklemesi)
- `AGENTS.md` (Görev takip tablosu güncellemesi)

---

## Opus review (2026-10-18)

- **Bug:** `F` is the slice shot in a match (`src/input.js` `KeyF: 'slice'`), so every slice toggled fullscreen. `bindFullscreenKey` now takes `enabled()`; main.js passes "no match running" (`#hud` hidden). In a match: the ⛶ button, the pause menu item, or the browser's F11. Help texts and `kontroller.html` say so; test added.
