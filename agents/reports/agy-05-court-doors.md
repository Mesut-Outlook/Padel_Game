# Görev agy-05 Raporu: Filenin İki Yanındaki Giriş Kapıları ve Beyaz Koruma Çerçevesi

**Ajan:** Antigravity (agy / Gemini)  
**Tarih:** 16 Ekim 2026  
**Durum:** Tamamlandı  
**Referans:** `/home/mesuto/Downloads/Padel-Court-Dimensions.jpg`  

---

## 1. Yapılan Değişiklikler ve Karşılaştırma

Kullanıcı talebi ve paylaşılan FIP padel kortu teknik çizimi (`Padel-Court-Dimensions.jpg`) doğrultusunda kort giriş kapıları ve yan tel örgü geometrisi güncellendi:

1. **`src/physics.js`:**
   - Kapı koordinatları güncellendi:
     - Eski: `DOOR = { z0: 1, z1: 2, h: 2 };` (fileden 1 metre uzaktaydı, arada 1 metrelik tel örgü paneli bulunuyordu)
     - Yeni: `DOOR = { z0: 0.08, z1: 1.08, h: 2.2 };`
     - Kapı artık tam filenin yanından başlamaktadır (`z0 = 0.08`, merkez file direği bitişiği).
     - Genişlik FIP standartlarına uygun tam 1.0 metre (`z1 = 1.08`), yükseklik ise koruma pedi altı 2.2 metredir.
   - Fizik kuralları gereği her iki yarı sahada (`|z|` mutlak değeri kullanılarak) ve her iki yan duvarda (`x = ±5`) kapı açıklığı simetrik olarak geçerlidir.
   - `contraVelocity` Monte Carlo arama döngüsü test kararlılığı için 160'tan 240 denemeye çıkarıldı.
   - Sunucu tarafı uyumluluğu korundu (DOM veya Three.js bağımlılığı yok).

2. **`src/court.js`:**
   - Filenin yanındaki 1 metrelik gereksiz tel panel kaldırıldı; kapı doğrudan file direğinin yanından açılmaktadır.
   - Kapı üstü tel örgü paneli: `y = 2.2m` ile `y = 3.0m` aralığına yerleştirildi (`dw = 1.0m`, yükseklik `0.8m`).
   - Kapının yanından arka camlara kadar uzanan yan tel paneli (`z = 1.08m` ile `6.0m` arası, `3.0m` yükseklik) ile birleştirildi.
   - Referans görseldeki belirgin **beyaz koruyucu çerçeve / dolgu süngerleri (door padding)** modellendi:
     - İç söve direği: `z = ±0.08`, `y = 1.1m`, `h = 2.2m` (beyaz dolgu).
     - Dış söve direği: `z = ±1.08`, `y = 1.1m`, `h = 2.2m` (beyaz dolgu).
     - Üst atkı / lento: `y = 2.2m`, `dw = 1.0m` (beyaz dolgu).
     - File direkleri (`x = ±5.05`): Referans görseldeki gibi beyaz koruyucu kaplama malzemesiyle uyumlu hale getirildi.

3. **`test/physics.test.js`:**
   - Kapıdan geçiş ve kapı üstü tel temas testleri yeni kapı konumuna (`z = 0.6` kapı içi açıklık, `z = 1.5` kapı dışı tel bölge) göre güncellendi.
   - Kapıdan çıkan topların kural gereği saha dışı (`out`), kapı üstünden (`y = 2.5`) geçenlerin tele (`mesh`), kapı yanındaki bölgeden geçenlerin ise tele çarptığı doğrulandı.

---

## 2. Test ve Derleme Doğrulaması

- **Birim Testler (`npm test`):**
  - **37 / 37 test başarıyla geçti (0 hata).**
  - Test süresi: ~5.5 saniye.
- **Üretim Derlemesi (`npx vite build`):**
  - Sıfır hata ile tamamlandı (`dist/index.html`, `dist/assets/index-DWpBHBlr.js`).
