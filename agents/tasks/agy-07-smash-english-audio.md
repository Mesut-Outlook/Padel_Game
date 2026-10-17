# Görev agy-07: Smaç Yavaş Çekim (Slow-Mo) Raket Düzeltmesi, Efekt Yazısı & Melodisi, Seyirci Sesleri, Oyun Müziği ve Tam İngilizce Dil Desteği

Sen Antigravity ajanısın; Claude Opus reviewer.

Kullanıcı Talebi: Yarıda kalmış işlerin tamamlanması: smaç anında yavaş çekimdeki raket titremesi/poz hatasının giderilmesi, smaç yazısı ve melodisi, ralli aralarında seyirci sesleri ve fon müziği, projenin tam İngilizceye çevrilmesi.

1. **Smaç Yavaş Çekim Raket Davranışı (`src/player.js`):**
   - Slow-mo (`0.38x`) sırasında fizik adımının çalışmadığı ara karelerde `closing` hızının sıfırlanıp `prepW` pozunun titremesini önle; top hareketini fiziksel adımlarla sınırla.
   - Koşu/yürüyüş animasyonu ile raket hazırlığı çakışmalarını `idleQuats` slerp ile üst gövdede sabitle.
   - Trophy stance (`overhead`) ve smash follow-through açılarını doğal padel pozlarına uyarla.

2. **Smaç Görsel & İşitsel Efektleri (`index.html`, `src/main.js`, `src/audio.js`):**
   - Smaç fırsatında odaklanma efekti (`#smashVignette`) ve dinamik `#smashBanner` (`⚡ SLOW MOTION ⚡ / SMASH TIME!`). Vuruş anında hız (`KM/H`) ve `SUPER SMASH!` pankartı.
   - Zaman-bükülmesi sub-bass + D-Dorian sentezleyici melodi (`sfxSmashSlowMo`) ve vuruş darbe akoru (`sfxSmashImpact`).

3. **Seyirci Tepkileri ve Fon Müziği (`src/audio.js`, `src/main.js`):**
   - Ralli içinde smaç/víbora/camdan dönen topta `'ooh'`, uzun rallilerde alkış/ıslık `'cheer'`, servis hatalarında `'murmur'`.
   - Prosedürel 116 BPM WebAudio "Padel Tour" arka plan synth müziği (`startMusic`), oyun durumuna göre dinamik ses kısma (`setMusicDuck`), `M` tuşu ile kontrol.

4. **Tam İngilizce Dil Desteği (Full English Localization):**
   - Oyuncu konuşmaları (`callout` / `LINES.en` ve Web Speech `en-US`), ana menü, oyun içi HUD (GOLDEN POINT, SET, PTS), duraklatma menüsü, tuş yardımı, 14 derslik eğitim modu, kontroller ve test sayfaları, sunucu/ağ mesajları.

5. **Doğrulama ve Yayın:**
   - `npm test` tüm testleri geçmeli (`38/38`), `npx vite build` hatasız olmalı, rapor yazılıp commit/push edilmeli.

Rapor: `agents/reports/agy-07-smash-english-audio.md`.
