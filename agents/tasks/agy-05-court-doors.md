# Görev agy-05: Kort Giriş Kapıları ve Beyaz Koruma Çerçevesi

Sen Antigravity ajanısın; Claude Opus reviewer. FIP teknik çizimi (`/home/mesuto/Downloads/Padel-Court-Dimensions.jpg`) doğrultusunda kort kapılarını ve yan tel geometrisini standartlara uygun hale getir.

1. **`src/physics.js`:**
   - Kapı koordinatlarını FIP standartlarına getir: `DOOR = { z0: 0.08, z1: 1.08, h: 2.2 }`.
   - Kapı filenin hemen yanından başlamalı (merkez direk bitişiği `z0 = 0.08`), genişlik 1.0 m (`z1 = 1.08`), yükseklik 2.2 m olmalıdır.
   - Her iki yarı saha (`|z|`) ve her iki yan duvarda (`x = ±5`) simetrik geçerli olmalı.
   - Kapıdan çıkan toplar kural gereği saha dışı (`out`) sayılmalı.
   - `contraVelocity` Monte Carlo deneme sayısını test kararlılığı için artır.
   - Server uyumluluğunu koru (DOM / Three.js importu yok).

2. **`src/court.js`:**
   - Filenin yanındaki 1 metrelik gereksiz tel paneli kaldır; kapı doğrudan file direğinin yanından açılsın.
   - Kapı üstü tel panelini `y = 2.2m` ile `y = 3.0m` arasına yerleştir (`dw = 1.0m`, `h = 0.8m`).
   - Beyaz koruyucu çerçeve / dolgu süngerlerini (door padding) modelle: iç söve, dış söve direkleri ve üst atkı / lento. File direklerini de uyumlu beyaz koruma kaplamasıyla hizala.

3. **`test/physics.test.js`:**
   - Kapıdan geçiş ve kapı üstü tel temas testlerini yeni koordinatlara göre güncelle.

Rapor: `agents/reports/agy-05-court-doors.md`. `npm test` hatasız geçmeli.
