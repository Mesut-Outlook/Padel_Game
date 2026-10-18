# Görev agy-16: Tam Ekran (Fullscreen) Geçiş Düğmesi ve 'F' / 'F11' Kısayolu

Sen Antigravity ajanısın; Claude Opus reviewer.

Kullanıcı Talebi: "bundan sora ekrani full ekran yapacak tus ekle... bunu da is listesine ekle.."

## Yapılacaklar
1. **Fullscreen Yardımcı Modülü (`src/fullscreen.js`):**
   - `isFullscreen()`, `toggleFullscreen()`, `updateFullscreenButtons()`, `bindFullscreenKey()`.
   - Standart Fullscreen API desteği ve webkit/moz/ms geriye dönük uyumluluk.
   - Giriş alanları (`INPUT`, `TEXTAREA`, `SELECT`, `contentEditable`) koruması: kullanıcı oda kodu veya isim yazarken 'F' tuşuna bastığında tam ekran tetiklenmez.
   - `fullscreenchange` event dinleyicisi ile ekrandaki tüm tam ekran butonlarının ikonunu (`⛶` / `🗗`) ve metnini senkronize etme.

2. **UI Butonları:**
   - **HOME Ekranı:** Alt buton çubuğuna `#hm-btn-fullscreen` ("⛶ Fullscreen") butonu.
   - **Sihirbaz (#menu):** Üst çubuğa `#pl-fs-btn` ("⛶") butonu.
   - **Maç İçi HUD:** `#cam` kamerasının hemen üzerine `#fsBtn` ("⛶") butonu.
   - **Duraklatma Menüsü (Pause):** Duraklatma seçenekleri arasına "Fullscreen (F)" / "Exit Fullscreen" maddesi.

3. **Klavye Kısayolları & Dokümantasyon:**
   - `F` ve `F11` tuşları ile tam ekrana geçiş / çıkış.
   - `public/kontroller.html` ve `src/helpkeys.js` kontroller yardımına `F` kısayolunun eklenmesi.

4. **Testler & Rapor:**
   - `test/fullscreen.test.js`: `isFullscreen`, `toggleFullscreen`, `bindFullscreenKey` ve `updateFullscreenButtons` birim testleri.
   - `npm test` ve `npx vite build` doğrulaması.
   - Rapor: `agents/reports/agy-16-fullscreen.md`.
