# Report: agy-35 — Belgeler ve Yardım Metinleri Yeni Akışa Göre

## Özet
Ana sayfanın canlı lobiye dönüştürülmesi (PLAY NOW, Invite a friend, Play vs AI, Customize sihirbazı, açık odalar listesi, beklerken ısınma modu, 5 sn geri sayım, ✕ Exit düğmesi ve rakip ayrılınca "Continue vs AI / Back to lobby" seçenekleri) sonrasında kullanıcıların ve geliştiricilerin okuduğu tüm dokümantasyon, yardım sayfaları, ipuçları ve çeviri tabloları yeni akışa uygun olarak güncellendi.

---

## Değişen Dosyalar ve Bölüm Başlıkları

### 1. `README.md`
Aşağıdaki bölümlerde güncellemeler yapıldı:
- **`## Hızlı başlangıç`**:
  - `İnternetten arkadaşlarla:` paragrafı güncellendi. Eski "yalnızca odayı kuran maçı başlatır" yerine; canlı lobi, PLAY NOW ile hızlı giriş, arka planda AI'ya karşı ısınma, 2. oyuncu geldiğinde 5 sn geri sayımla başlayan otomatik online maç, tek dokunuşla davet linki, ✕ Exit ile çıkış ve ayrılan rakip yerine AI'ın devralması anlatıldı.
- **`## Nasıl Oynanır ve Canlı Lobi`** *(Yeni Eklenen Bölüm)*:
  - Ana sayfanın artık canlı lobi olduğu (`src/home.js`).
  - **PLAY NOW (Hemen Oyna)**: Menü gezintisi olmadan tek tıkla maça girme.
  - **Tekler (Singles) / Çiftler (Doubles)** seçimi.
  - **Aynı Takım (Team up) / Karşı Karşıya (Face off)**: 2 insan oyuncunun aynı takımda 2 AI'ya karşı veya karşılıklı 1 insan + 1 AI olarak oynayabilmesi.
  - **Beklerken Isınma (Warm-up)**: Başka bir oyuncu beklenirken çevrimdışı ısınma maçının arka planda kesintisiz çalışması.
  - **5 Saniye Geri Sayım**: 2. oyuncu katıldığında geri sayımla online maça geçiş.
  - **Invite a friend**: Tek dokunuşla davet linki üretme.
  - **Play vs AI**: Tercih edilen ayarlarla yapay zekâya karşı çevrimdışı maç.
  - **Customize (Özelleştir)**: Karakter, raket, mekan ve kuralları ayarlamak için 4 sekmeli sihirbazı (`src/menu.js`) açma.
  - **Open Games (Açık Maçlar)**: Sunucudaki açık maçların canlı listesi ve tek tıkla katılım.
  - **Alt Çubuk**: Kariyer, Eğitim, Ayarlar, Kontroller, Tam Ekran.
- **`## Online ve Arkadaşınla Oyna`** *(Yeni Eklenen Bölüm)*:
  - **Davet Linki (Tek Dokunuşla Giriş)**: `?room=...` linki ile doğrudan odaya katılma.
  - **Oda Kodu (Yedek Yol)**: Paylaşım yapılamadığında 6 karakterlik kodla katılım.
  - **Maçtan Çıkış (✕ Exit)**: Sol üstteki ✕ Exit düğmesi (Esc / Start) ile "Leave the match?" penceresi.
  - **Rakip Ayrıldığında**: Koltuğun kalıcı olarak AI'a devredilmesi ve kalan oyuncuya "Continue vs AI / Back to lobby" seçenekleri.
  - **Sunucu Durumu**: Sunucunun henüz 7/24 kalıcı olarak açık olmadığı, arkadaş testlerinin geçici bağlantı (tünel) üzerinden yürütüldüğü (Pi veya ev ağı bilgisi kesinlikle yazılmadı).
- **`## Ziyaret sayacı (GoatCounter)`**:
  - `online-interest` olay satırındaki eski "Online sekmesi" ifadesi "Canlı lobi" olarak güncellendi.
- **`## Kontroller`**:
  - Klavye / kol tablosundaki `R / Esc` satırı güncellendi:
    - `✕ Exit / Esc | maçtan çıkış penceresi (Leave the match?) · tekrarı geç | Start / B`
    - `R | son sayının tekrarı | R3`
- **`## Özellikler`**:
  - `Giriş ekranı`: Eski 5 sekmeli menü yerine **Ana sayfa & Canlı lobi** (`src/home.js`) ve Customize ile açılan 4 sekmeli görsel sihirbaz (`src/menu.js`: Oyuncu · Mekan · Raket · Maç) olarak güncellendi.
  - `Arayüz & Dil Desteği`: 8 dil desteği, canlı lobi, hazırlık sihirbazı, ✕ Exit düğmesi / Esc çıkış penceresi ("Leave the match?"), rakip ayrılma bildirimi ("Continue vs AI / Back to lobby") ve kontroller sayfası eklendi.
- **`## Yol haritası`**:
  - Tamamlanan `agy-30`, `agy-31`, `agy-35` için canlı lobi ve yeni akış maddesi işaretlendi.

---

### 2. `kontroller.html`
- **`During a Match` -> `Camera & System` (Masaüstü)**:
  - Esc satırına sol üstteki `✕ Exit` düğmesi eklendi:
    ```html
    <tr><td><kbd>Esc</kbd> · ✕ <span data-i18n="Exit">Exit</span></td><td data-i18n="Exit menu (also the ✕ Exit button top left) · skip replay">Exit menu (also the ✕ Exit button top left) · skip replay</td></tr>
    ```
- **`Tablet & Phone (iPad, Android)` -> `Touch screen` (Dokunmatik)**:
  - Top bar düğmeleri satırındaki `✕ Exit` metni `<span data-i18n="Exit">Exit</span>` ile sarılarak tüm dillere dinamik çevrilmesi sağlandı:
    ```html
    <tr><td>✕ <span data-i18n="Exit">Exit</span> · 🎥 · 🔁 · 🔈 · 📊 · ❔ <span data-i18n="(top left)">(top left)</span></td><td data-i18n="Exit menu · camera · replay of the last point · sound on / off · scoreboard (auto / hidden / always on) · touch tips">Exit menu · camera · replay of the last point · sound on / off · scoreboard (auto / hidden / always on) · touch tips</td></tr>
    ```

---

### 3. `src/tips.js`
- **`TIPS` listesi**:
  - Eski "Pause menu" gibi geçersiz bir akış ifadesi bulunmadığı teyit edildi.
  - Maç içi sol üst ✕ Exit düğmesini oyuncuya bildiren yeni ipucu eklendi:
    ```javascript
    { kb: N_('Press ✕ Exit to leave the match.'), pad: N_('Press ✕ Exit to leave the match.') },
    ```

---

### 4. `src/locales/*.js` (7 Dil Tablosu) & `data/i18n-keys.json`
Tüm 7 dilde (`de.js`, `es.js`, `fr.js`, `it.js`, `nl.js`, `pt.js`, `tr.js`) yeni anahtarlar eklendi ve eski kullanılmayan anahtar güncellendi:

#### Eklenen Metin Anahtarları:
1. `"Exit menu (also the ✕ Exit button top left) · skip replay"`
   - **en**: `"Exit menu (also the ✕ Exit button top left) · skip replay"`
   - **de**: `"Beenden-Menü (auch ✕ Beenden oben links) · Replay überspringen"`
   - **es**: `"Menú de salida (también botón ✕ Salir arriba a la izquierda) · saltar repetición"`
   - **fr**: `"Menu quitter (aussi bouton ✕ Quitter en haut à gauche) · passer le replay"`
   - **it**: `"Menu di uscita (anche pulsante ✕ Esci in alto a sinistra) · salta replay"`
   - **nl**: `"Afsluitmenu (ook ✕ Verlaten-knop linksboven) · replay overslaan"`
   - **pt**: `"Menu de saída (também botão ✕ Sair no canto superior esquerdo) · saltar repetição"`
   - **tr**: `"Çıkış menüsü (ayrıca sol üstteki ✕ Çıkış düğmesi) · tekrarı atla"`

2. `"Press ✕ Exit to leave the match."`
   - **en**: `"Press ✕ Exit to leave the match."`
   - **de**: `"Drück ✕ Beenden, um das Match zu verlassen."`
   - **es**: `"Pulsa ✕ Salir para salir del partido."`
   - **fr**: `"Appuie sur ✕ Quitter pour quitter le match."`
   - **it**: `"Premi ✕ Esci per abbandonare la partita."`
   - **nl**: `"Druk op ✕ Verlaten om de match te verlaten."`
   - **pt**: `"Carrega em ✕ Sair para sair do jogo."`
   - **tr**: `"Maçtan çıkmak için ✕ Çıkış'a bas."`

#### Silinen / Kullanımdan Kalkan Metin Anahtarları:
1. `"Exit menu · skip replay"` (yerine yukarıdaki açıklayıcı masaüstü/mobil düğme anahtarı getirildi).

---

## Doğrulama ve Test Sonuçları

1. **`node tools/extract-keys.js`**:
   - `1049 keys -> data/i18n-keys.json` başarıyla derlendi.
2. **`npm test`**:
   - 294 testin 294'ü de başarıyla geçti (0 fail, 0 skipped).
   - `test/i18n-keys.test.js`: Tüm dillerde eksiksiz anahtar ve etiket eşleşmesi doğrulandı.
   - `test/tips.test.js`: İpucu döngüsü ve klavye/pad ifadeleri doğrulandı.
3. **`npx vite build`**:
   - Üretim derlemesi sıfır hata ile tamamlandı.
4. **Gizlilik & Güvenlik**:
   - Repo kamuya açık olduğu için hiçbir kişisel veri, IP adresi, Raspberry Pi kullanıcı adı ya da ev ağı detayı eklenmedi.
