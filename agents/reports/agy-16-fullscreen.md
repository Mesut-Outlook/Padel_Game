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

---

## 4. Ek İyileştirme: Duraklatma Menüsünde Kol (Controller) ile Gezinme Düzeltmesi

Kullanıcı bildirimi: *"oyun pause edildiginde kontroller ile resume, restart ve fullscreen menusunde dolasamayiyor konreoller ile.."*

### Tespit Edilen Nedenler
1. `src/main.js` içerisindeki `pauseInput()` yalnızca D-pad (`padEdge(12)` ve `padEdge(13)`) kontrolü yapıyordu; sol analog çubuk (`axes[1]`) tamamen yok sayılıyordu.
2. Yalnızca ilk gamepad (`find(Boolean)`) kontrol ediliyordu.
3. Menü elemanları üzerinde fare `onmouseenter` dinleyicisi olduğundan fare ekranda sabit dururken dahi gamepad odağını ezebiliyordu.
4. Duraklatmaya girildiğinde Start veya Esc tuşu edge guard'a sahip olmadığından anında geri çıkma ya da menü elemanını seçme riski vardı.

### Yapılan Çözümler (`src/main.js`)
- `padDir` fonksiyonu [`src/padnav.js`](file:///home/mesuto/Documents/PROJELER/Padel_Game/src/padnav.js)'den içe aktarıldı. Hem D-pad hem de sol analog çubuk (ölü bölge eşiği ile) entegre edildi.
- Yukarı/aşağı basılı tutulduğunda yumuşak geçiş için otomatik tekrar (auto-repeat: 280ms gecikme, 150ms aralık) eklendi.
- Bağlı olan tüm gamepad'ler taranacak şekilde genişletildi.
- Menü butonlarındaki `onmouseenter` yerine `onmousemove` kullanılarak klavye/kol gezinmesinin fare tarafından bozulması engellendi.
- Onay için `A` / `✕` (buton 0), duraklatmadan çıkmak için `B` / `○` (buton 1) ve `Start` / `Options` (buton 9) tuşları bağlandı ve `setPaused(true)` anında edge guard'lar eklendi.
---

## 5. Ek İyileştirme: Tester Geri Bildirimleri ve Oynanış Düzeltmeleri

### 1. Sayı Bildirimi ve Hata Yapan Oyuncu İsmi Düzeltmesi
- **Sorun:** Sayı bir hata (ör. `bounced own side`, `hit own mesh`, `direct wall out`, `double fault`) ile bittiğinde ekranda sayıyı alan oyuncunun adı ("Mumtaz bounced on own side") yazıyordu.
- **Çözüm ([`src/main.js`](file:///home/mesuto/Documents/PROJELER/Padel_Game/src/main.js)):** Hata durumlarında (`bounced own side`, `hit own mesh`, `hit opponent wall directly`, `double fault`, `volleyed serve`, `double hit` ve direk auta vurma) mesaj başlığına hatayı yapan oyuncu (`1 - e.team`); temiz vuruş / çift sekme (`double bounce`, `cleanWinner`) durumlarında ise sayıyı kazanan oyuncu (`e.team`) yazdırıldı.

### 2. Kamera Açısına Göre Yön Kontrolleri (Camera-Relative Controls)
- **Sorun:** Yan veya farklı kameralara geçildiğinde kontroller dünya eksenine (sabit TV kamerasına) bağlı kaldığından, yan kamerada aşağı tuşu karakteri sola götürüyordu.
- **Çözüm ([`src/input.js`](file:///home/mesuto/Documents/PROJELER/Padel_Game/src/input.js), [`src/main.js`](file:///home/mesuto/Documents/PROJELER/Padel_Game/src/main.js)):**
  - Aktif kameranın yatay düzlemdeki sağ (`right`) ve ileri (`forward`) yön vektörleri hesaplanarak `toWorld(sx, sy, team, camPlane)` fonksiyonuna iletildi.
  - Hangi kameraya geçilirse geçilsin ekranda yukarı basıldığında karakter ekranda yukarı, sola basıldığında ekranda sola doğru hareket eder hale getirildi.

### 3. Topa Yön Verme (Aim) ve Ok Tuşları (`←` / `→`) Desteği
- **Sorun:** `A + Space` topu sola yönlendirirken `← + Space` yönlendirmiyordu veya tarayıcı varsayılan davranışı tuşları yutabiliyordu.
- **Çözüm ([`src/input.js`](file:///home/mesuto/Documents/PROJELER/Padel_Game/src/input.js), [`src/game.js`](file:///home/mesuto/Documents/PROJELER/Padel_Game/src/game.js)):**
  - Ok tuşları (`ArrowLeft`, `ArrowRight`, `ArrowUp`, `ArrowDown`) ve `Space` için oyun sırasında tarayıcı odak/sayfa kaydırması engellendi (`e.preventDefault()`).
  - Vuruş hazırlanırken (`pl.wantT > 0`) yön tuşu basıldığında `pl.aim` dinamik olarak güncellendi.
  - Vuruş anında da tutulan yön aim olarak geçerli kılındı.

### 4. P Tuşu (Pause) Görünürlüğü ve Dokümantasyonu
- **Sorun:** P tuşu oyunu duraklatıyordu ancak ekrandaki kontrollerde (H yardım paneli ve rehber) yazmıyordu.
- **Çözüm ([`src/helpkeys.js`](file:///home/mesuto/Documents/PROJELER/Padel_Game/src/helpkeys.js), [`public/kontroller.html`](file:///home/mesuto/Documents/PROJELER/Padel_Game/public/kontroller.html)):**
  - `src/helpkeys.js` içindeki `K` sözlüğüne `KeyP: ['P', 'sys', 'pause']` eklendi; tuş yardım panosunda `P` tuşu 'pause' etiketi ve sistem rengiyle gösterildi.
  - Alt yardım metinlerine ve `kontroller.html` sayfasına hem ok tuşlarıyla aim (`A / D or ← / →`) hem de `P / Esc: pause` eklendi.

### 5. Lob (Aşırtma) ve Yapay Zeka Smaç Mantığı
- **Sorun:** Kullanıcı loba karşılık yapay zekanın neredeyse her seferinde smaç vurduğunu ve aşırtmanın etkisiz kaldığını belirtti.
- **Çözüm ([`src/ai.js`](file:///home/mesuto/Documents/PROJELER/Padel_Game/src/ai.js), [`src/game.js`](file:///home/mesuto/Documents/PROJELER/Padel_Game/src/game.js)):**
  - Padel mantığına uygun olarak: Geriye doğru koşarken arkaya atılan derin bir loba havada smaç vurulması gerçekçi değildir.
  - `chooseShot` ve `select` fonksiyonlarında derin lob tespiti (`an.lob` ve `an.firstFloorZ >= 7.0`) yapıldı.
  - Derin loblarda yapay zekanın havada geriye koşup smaç vurması engellendi; fileden geriye açılması, bandejayla savunma yapması veya topun sekip arka camdan çıkmasını beklemesi sağlandı. Yalnızca file önüne düşen kısa/hatalı loblarda smaç izni verildi.
  - `SHOTS.lob` uçuş süresi ve yüksekliği kavisli geçiş için optimize edildi (`t: 1.85s`, `depth: 8.8m`).

### 6. Tekrar Oynatmada (Instant Replay) Son 3 Vuruşun Gösterilmesi
- **Talep:** *"tekrar goruntulemede son 3 vurusu gostersen daha iyi"*
- **Çözüm ([`src/replay.js`](file:///home/mesuto/Documents/PROJELER/Padel_Game/src/replay.js), [`src/main.js`](file:///home/mesuto/Documents/PROJELER/Padel_Game/src/main.js)):**
  - `replay` modülüne vuruş anlarını kaydeden `markHit()` ve rallinin son `count` (varsayılan 3) vuruşunu oynatan `playLastShots(count, opts)` eklendi.
  - Sayı bittiğinde veya `R` tuşuna basıldığında tekrar oynatma, 3. son vuruşun 0.4 saniye öncesinden başlayarak rallinin final aksiyonunu (hazırlık, pas ve bitirici vuruş) ekrana getirecek şekilde ayarlandı.



## Opus review 2 (2026-10-18)

- Checked: `an.lob` / `an.firstFloorZ`, `lastHitter` / `teamOf`, `markHit` / `playLastShots` all exist; 102 tests pass; a friendly match and the pause menu (↓ moves the selection, Esc resumes) ran in the browser with no console errors.
- **Bug fixed:** `input.js` called `preventDefault()` on arrows and Space everywhere, so menu `<select>`s, Space on buttons and page scrolling broke outside matches. Now only while `#hud` is shown (same "match running" test as the fullscreen key).
- Removed the `e.key` / `'Left'` key tracking: `e.code` already covers the arrows, and `e.key` entries could stick (`a` down, `A` up with Shift).
- Note: movement and aim are now screen-relative for every camera. A second local player on the far team now moves screen-up = away from the camera (before: toward the net).
