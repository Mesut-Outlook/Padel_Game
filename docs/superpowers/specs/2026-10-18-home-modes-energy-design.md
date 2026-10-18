# Açılış Ekranı, Oyun Modları ve Enerji Ürünleri — Tasarım

Tarih: 2026-10-18 · Durum: taslak, kullanıcı onayı bekliyor

## 1. Amaç ve neden

Bugün oyun açılınca 11 açılır listeli tek bir "Quick match" formu geliyor; kariyer ve online bu formun içine sıkışmış. Yeni gelen biri ne yapacağını bilemiyor. Kullanıcının istediği:

> "Açılış sayfası Padel Legends adı ve kısa bir animasyonla 2-3 sn'lik başlasın, ardından hemen şu seçeneklere uygun isimlendirmeler yap… kişi kendi başına evde tek başına ya da online bir arkadaşıyla friendly maç yapabilir… bir diğeri de kendi başına bilgisayarla kariyerini devam ettirebilir… ya da bir grup arkadaşıyla turnuva organize edip onları davet edip aynı odada kendi başlarına turnuva oynayabilmeliler… turnuva maçları tarih ve saatleri belli olunca o maça girenler ile oynanır, eksik kişileri AI oyuncu tamamlar… bu ekrandan sonra da oyun, oyuncu ve diğer detay sayfaları gelir."

Ayrıca açık karar #1 kapandı: **kariyer marketine enerji ürünleri eklenecek**, değerleri gerçek spor beslenmesine dayanarak Opus belirleyecek.

## 2. Hedefler, hedef dışı, kaçınılacaklar

**Hedefler**
- A. Markette enerji ürünleri (muz, izotonik içecek, enerji jeli), maça bir tür götürülür, molada ek enerji verir, tükenir.
- B. 2–3 saniyelik açılış animasyonu + üç modlu ana ekran + her modun adım adım kurulum sayfaları (oyun → oyuncu → detay).
- C. **Friends Cup**: arkadaşlarla özel, takvimli online turnuva; maç saatinde gelenler oynar, boş koltuklara AI oturur.

**Hedef dışı:** hesap/giriş, e-posta/push bildirim, sohbet, ücretli içerik, açık (yabancılara açık) online turnuvalar — bunlar Faz 3b.

**Kaçınılacaklar (çalışsa bile başarısızlık):**
- Açılış animasyonunun oyunu yavaşlatması ya da her menüye dönüşte tekrar oynaması.
- Mevcut hızlı maç, kariyer, eğitim, online oda, tekrar ve kol ile gezinmenin bozulması.
- Friends Cup'ın arkadaşlar arasında Credits çiftliğine dönmesi.
- Sunucu yeniden başlayınca turnuvanın kaybolması.

## 3. Kısıtlar

- Plain ES modules, framework yok; `game.js`, `physics.js`, `rules.js`, `ai.js` sunucuyla paylaşılır → DOM/three yok. Yeni saf mantık (`cup.js`) DOM'suz ve `node:test` ile test edilir; her kural değişikliğine bir test.
- Intel HD 620: açılış animasyonu **DOM/CSS** (ek 3D sahne yok), pixelRatio ≤1.25.
- Arayüz İngilizce. Kol ile gezinme `padnav.js` (D-pad + çubuk, konuma göre odak) tüm yeni ekranlarda çalışmalı.
- İstemci GitHub Pages'te; online için ayrı Node sunucusu (`server/server.js`, odalar bellekte) gerekiyor. Bugün herkese açık, sürekli çalışan bir sunucu **yok**.
- `tournament.js` tek bir insanı (`'me'`) varsayıyor; diğer maçları simüle ediyor.

## 4. A — Enerji ürünleri

### 4.1 Gerçek dünya dayanağı
- Tenis/padel rehberleri: maç 1–2 saati geçince saatte **30–60 g karbonhidrat**, her molada ~200 ml (27 °C üstünde 400 ml+) elektrolitli sıvı.
- **Enerji jeli:** 20–30 g karbonhidrat, 30–40 ml'de; en hızlı emilen biçim. Sahada ilk kez denenmemesi önerilir.
- **İzotonik içecek:** jel kadar hızlı emilir (aynı karbonhidrat için 200–300 ml), üstüne sıvı + elektrolit → yorgunluğu da yavaşlatır.
- **Muz:** ~27 g karbonhidrat (glikoz+fruktoz+sakaroz), kolay ama jelden yavaş sindirilir → hemen az, sonra uzun süre enerji.

Kaynaklar: [Precision Hydration — tenis](https://www.precisionhydration.com/performance-advice/nutrition/how-to-fuel-for-tennis/), [Sheffield Hallam — Nutrition for tennis](https://shura.shu.ac.uk/8507/), [Padel nutrition & hydration guide](https://www.padelbrowser.com/blog/padel-nutrition-hydration-guide), [mysportscience — bar/jel/içecek](https://www.mysportscience.com/post/2017/09/18/what-is-better-energy-bars-gels-or-drinks), [Herbalife — enerji jelleri](https://www.herbalife.com/en-gb/wellness-resources/behind-the-science/what-the-experts-say-on-carbohydrate-containing-energy-gels).

### 4.2 Oyun değerleri *(Opus kararı)*
Bugün her molada herkes `ENERGY.drink = 0.3` (su) alıyor. Ürün bunun **üstüne** eklenir. Her ürünün iki etkisi var: `boost` = her molada ek enerji, `tire` = maç boyunca yorulma çarpanı.

| Ürün | id | Kilit | 5'li paket | Maç başı | Molada ek | Yorulma | Karakter |
|---|---|---|---|---|---|---|---|
| Banana | `fuel_banana` | amateur | 60 Credits | 12 | +0.06 | ×0.90 | yavaş salınım: uzun maçta, düşük dayanıklılıkta en iyi |
| Isotonic drink | `fuel_isotonic` | club | 100 Credits | 20 | +0.12 | ×0.95 | dengeli: sıvı + karbonhidrat |
| Energy gel | `fuel_gel` | regional | 150 Credits | 30 | +0.20 | ×1.00 | hızlı patlama: molada yorgunsan en iyi |

- Ekonomi kontrolü: bir kariyer maçı Club seviyesinde ~60–110 Credits getiriyor → ürün maç başına kazancın ~%10–30'u. Hissedilir ama zorunlu değil.
- Değerler `data/shop.json`'da (`type: "fuel"`, `pack: 5`, `boost`, `tire`) → oynayarak ayar.
- Yorulma çarpanı `tire()` içinde `k` ile çarpılır; `boost` mola satırına eklenir (`game.js` mola kodu). Oyuncu verisine `pl.fuel = { boost, tire }` (varsayılan `{0, 1}`).

### 4.3 Kurallar *(Opus kararı)*
- Profil: `profile.supplies = { fuel_banana: 3, … }` (sayaç), `equipped.fuel = id | null`. Eski profiller geçerli kalır (alan yoksa `{}` / `null`).
- **Locker**'da yeni "Bag" yuvası; adet 0 ise otomatik boşalır.
- Kariyer maçı (turnuva maçları dahil) **başlarken** 1 adet düşer; maç yarıda bırakılırsa iade yok.
- Mola mesajı ürünü söyler: `💧 CHANGEOVER — isotonic drink, energy +`.
- Online kariyer maçında etki sunucuya gönderilir, sunucu bilinen değerlere sıkıştırır (`boost` 0–0.2, `tire` 0.9–1).
- AI rakipler ürün kullanmaz. Friendly ve Friends Cup'ta ürün yok (bkz. §6 sorun 4).

## 5. B — Açılış ve ana ekran

### 5.1 Akış
```
Splash (2.5 sn, her tuş geçer) ─▶ HOME
HOME ─┬─ FRIENDLY MATCH ─▶ Where? ─▶ Match ─▶ Player ─▶ (Lobby) ─▶ maç
      ├─ CAREER ─────────▶ mevcut kariyer hub'ı (#career)
      ├─ FRIENDS CUP ────▶ Create / Join ─▶ Cup page ─▶ Match room ─▶ maç
      └─ alt satır: Training · Settings · Controls · (Profile)
```

### 5.2 Splash *(Opus kararı)*
- DOM/CSS: koyu arka plan, top sekerek gelir, cama çarpar (mevcut cam sesi), "PADEL **LEGENDS**" logosu açılır, altında "MESUT PADEL" sponsor satırı. 2.5 sn, sonra HOME'a yumuşak geçiş.
- three.js ve karakter GLB'leri **arkada yüklenir**; splash yükleme süresini örter.
- Her tuş / tık / kol tuşu atlar. Oturumda yalnız **ilk açılışta** oynar (`sessionStorage`); menüye dönüşte oynamaz. `prefers-reduced-motion` → animasyonsuz logo, 1 sn.

### 5.3 HOME
Üç büyük kart (kol ile ←/→, Enter/A):

| Kart | Başlık | Alt yazı |
|---|---|---|
| 1 | **FRIENDLY MATCH** | Play now — solo vs AI, with friends on this computer, or online with a friend. |
| 2 | **CAREER** | Your player, your road from club courts to the Premier Finals. (Profil varsa: "Continue — <isim>, rank #N") |
| 3 | **FRIENDS CUP** | Create a tournament, invite your friends, play at set times. Missing players? AI steps in. |

Alt satır: **Training** (mevcut eğitim), **Settings** (kontrol, oyun hızı, ses — bütün modlar okur), **Controls** (mevcut kol yardımı), **Profile** (kariyer profili varsa).

### 5.4 FRIENDLY MATCH sayfaları
Düzeltme (2026-10-18, kod incelemesi): görünen menü zaten 5 adımlı bir sihirbaz (`src/menu.js`, agy-04: Mode · Player · Venue · Racket · Match, canlı önizleme); 11 açılır liste yalnız gizli eski form ve sihirbazın veri kaynağı. Friendly bu sihirbazı **yeniden kullanır**, sıfırdan yazılmaz:
1. **Mode** adımının başına **Where?**: `On this computer` (tek başına AI'ya karşı ya da aynı bilgisayarda 2–4 kişi) · `Online with a friend` (bugünkü online çekmece buraya taşınır: Create room → kod + paylaşım linki `?room=CODE` ve Kopyala; Join → kod; açık odalar listesi).
2. Player · Venue · Racket · Match adımları aynen kalır; kariyer profili varsa Player adımında "Use my career player" (görünüm + ekipman, Credits **kazandırmaz**).
3. Sihirbazdaki CAREER ve TRAINING düğmeleri HOME'a taşınır; Mode adımında B/Esc HOME'a döner.
- Son seçimler hatırlanır (`localStorage`, try/catch).

### 5.5 Gezinme *(Opus kararı)*
- Hash rotaları: `#home`, `#friendly`, `#career`, `#cup`, `#cup/CODE`. Tarayıcı Geri, Esc ve kolda B/○ hep bir üst ekrana döner.
- `?room=CODE` ve `?cup=CODE` linkleri splash'tan sonra doğrudan ilgili sayfaya iner.
- Mevcut `#menu` formu kaldırılır; alanları Friendly sayfalarına ve Settings'e dağıtılır. `startMatch(cfg)` / `startOnline()` imzaları değişmez.

## 6. C — Friends Cup

### 6.1 Oyuncu deneyimi
1. **Create cup** (ev sahibi): isim, format (Americano · Mexicano · Knockout · League), Singles/Doubles, oyuncu sayısı (4 / 8 / 16), her tur için tarih + saat (varsayılan: bugün 20:00, turlar arası 30 dk), oyuncu kuralı (Equal players / Career players), AI seviyesi.
2. **Invite**: link `?cup=CODE` + kod, Kopyala / paylaş. Arkadaş linki açar, ismini yazar, boş bir yeri alır.
3. **Cup page**: tablo/ağaç, sıradaki maçın ve geri sayım, katılanlar, takvime ekle (`.ics` indir). Ev sahibi: yer boşalt, AI ekle, saat değiştir, iptal.
4. **Match room**: saatten 10 dk önce açılır. Saatte gelenler oynar, 3 dk bekleme sonunda boş koltuklara AI oturur; herkes oradaysa ev sahibi erken başlatabilir.
5. Sonucu sunucu yazar (zaten otoriter); tablo herkes için güncellenir. Kupa bitince şampiyon ekranı.

### 6.2 Teknik çerçeve *(Opus kararı)*
- `src/cup.js` (saf): kupa durumu, tur takvimi, yer alma, sonuç işleme. Eşleştirme/sıralama için `tournament.js` **çok insanlı** hale getirilir (`'me'` yerine `humans: Set` — simüle edilmeyecek maçlar).
- Sunucu: `cup` mesajları (create/claim/get/update) + kupaları `server/data/cups.json`'a atomik yazma (geçici dosya + rename). Maç odası kodu `CUPCODE-r1m0` gibi; sunucu saatte odayı kendisi başlatır.
- Kimlik: hesap yok; yer alan herkesin tarayıcısına gizli bir `token` yazılır (`padel.cups.v1`). Ev sahibinin ayrıca `hostToken`'ı var.
- `tournament.js` dört formatı (Americano, Mexicano, Knockout, League) bugün tek insan için zaten uyguluyor; iş "çok insanlı" yapmak. Sunucu odaları bugün yalnız "kodla katıl, ev sahibi Start" → zamanlı başlatma, token'lı koltuk ve izleyici **gerçek bir sunucu değişikliği**, C'nin boyutuna dahil.

### 6.3 Kupa kuralları *(Opus kararları, builder kontrolünden sonra)*
- **Boş yerler:** 1. tur başladığında alınmamış her yer AI olur. Kupa sürerken yeni bir arkadaş linkle bir AI yerini alabilir; bir sonraki maçından itibaren o oynar (puanlar yere aittir).
- **Tur saatleri alt sınırdır:** tur N, `max(planlanan saat, tur N-1'in son maçı bitti)` anında başlar. Mexicano bir önceki turun sonucunu beklediği için bu zorunlu.
- **Maç ortasında çıkan:** koltuğu AI devralır (sunucunun bugünkü davranışı), hükmen yenilgi yok. Geri gelirse izleyici olur, sonraki maçta oynar.
- **Kimse gelmezse** maç `simulateMatch` ile sonuçlanır; kupa asla takılmaz.
- **Barındırma ayarı:** sunucu adresi yoksa kart kapalı ve açıklamalı. Kalıcılık tek JSON dosyası; diski her başlatmada silinen ücretsiz bulut planlarında (ör. Render free) kupalar kaybolur → orada kalıcı disk ya da kendi bilgisayar/VPS gerekir.

### 6.4 Diğer netleştirmeler *(Opus kararları)*
- Enerji ürünü sayacı istemcide düşer, sunucu yalnız değeri sıkıştırır; defter tutulmaz (kariyer zaten tarayıcıda ve hile koruması hedef dışı).
- Online Friendly'de "Use my career player": görünüm + ekipman her zaman gelir; özellikler için oda kuralı ev sahibinde: **Equal players** (varsayılan) / **Career players** — Friends Cup ile aynı.

## 7. Bulduğum sorunlar ve çözümleri

1. **Sürekli açık sunucu yok.** Friends Cup günlere yayılan takvim ve davet ister; bugün istemci GitHub Pages'te, sunucu yalnız `npm run online` ile yerelde çalışıyor ve odalar bellekte. *Çözüm:* kupalar dosyaya yazılır (yeniden başlatmada geri yüklenir) ve sunucu herkese açık bir yerde barındırılır. Sunucu adresi yoksa FRIENDS CUP kartı "Needs an online server" der ve kurulumu anlatır. → **Barındırma yeri kullanıcı kararı (§8).**
2. **Hesap yok → davet ve kimlik.** Kim hangi yerde, kim ev sahibi bilinmeli. *Çözüm:* link + yer başına gizli token (tarayıcıda). Tarayıcı değişirse ev sahibi "Reset slot" ile yeri yeniden açar. Faz 3b'de token hesaba bağlanır.
3. **Saat, saat dilimi, gelmeyenler, geç kalanlar.** *Çözüm:* saatler UTC saklanır, yerel saatle gösterilir; oda 10 dk önce açılır, 3 dk bekleme sonrası AI tamamlar; maça hiç insan gelmezse sonuç `simulateMatch` ile üretilir (kupa takılmaz); maç başladıktan sonra gelen izleyici olur. `.ics` dosyası hatırlatıcı yerine geçer (bildirim altyapısı gerekmez).
4. **Adalet ve Credits çiftliği.** Kariyerinde 10'a çıkmış biri yeni başlayanı ezer; arkadaşlar birbirine maç verip Credits kasabilir. *Çözüm:* ev sahibi seçer: **Equal players** (herkes özellik 6, standart raket/top — varsayılan) veya **Career players**. Friends Cup ve Friendly **Credits ve ürün vermez/harcamaz**; yalnız kupa geçmişi ve kupa rozeti.
5. **`tournament.js` tek insan varsayıyor.** Aynı turda birden çok insan maçı, aynı anda iki kort (Americano 8 kişi = 2 kort) gerekir. *Çözüm:* `humans` kümesi; o turda insanlı maçlar sunucuda gerçek oda, diğerleri simüle; tur ancak tüm maçlar bitince ilerler. Testler mevcut tek-insan davranışını korur.
6. **Splash ve yükleme HD 620'de çakışır.** 3D yükleme 2.5 sn'den uzun sürebilir. *Çözüm:* splash DOM/CSS, yüklemeyi örter; HOME yükleme bitmese de açılır, START düğmeleri ilerleme çubuğu gösterip hazır olunca etkinleşir.
7. **Modlar tek menüye sıkışmış.** Kariyer ve eğitim hızlı maç sihirbazının köşesinde düğme. *Çözüm:* HOME modları ayırır; Friendly mevcut 5 adımlı sihirbazı Where? adımıyla kullanır; son seçimler hatırlanır. (İlk taslaktaki "11 açılır liste" gizli eski formdu — düzeltildi.)
8. **Ayarlar dağınık; kariyer maçları Kontrol/Oyun hızını yok sayıyor** (bilinen hata). *Çözüm:* tek global Settings (`padel.settings.v1`) — Friendly, Career, Friends Cup aynı yerden okur; hata kendiliğinden kapanır.
9. **Geri tuşu ve derin linkler tutarsız.** *Çözüm:* §5.5 hash rotaları; her ekranın tek "üst" ekranı; Esc / B / tarayıcı Geri aynı şeyi yapar.

## 8. Kullanıcı kararları (2026-10-18)
1. **Sunucu barındırma: beklemede.** Kullanıcı bunu alan adı (domain) ile birlikte düşünüp karar verecek. O zamana kadar C'nin sunucuya bağlı kısmı (kalıcı kupa, zamanlı oda) yapılmaz; FRIENDS CUP kartı "Needs an online server" der.
2. **"Aynı oda" = aynı online oda** (kullanıcı onayladı). Aynı bilgisayarda (kanepede) kupa istenmiyor.
- Belge onaylandı. Kullanıcı B'yi hemen agy'ye verdi (`agy-15`, 2026-10-18); Opus 2026-10-19 02:00'de agy-14/agy-15'i review eder ve A'yı yapar. C sunucu kararından sonra.

## 9. Sıra *(Opus önerisi)*
1. **A — Enerji ürünleri** (küçük, sunucu gerektirmez)
2. **B — Splash + HOME + Friendly + Settings + rotalar**
3. **C — Friends Cup** (sunucu kararı geldikten sonra)

Her parça ayrı commit/PR, ayrı testlerle.

## 10. Builder'a kalanlar
Splash animasyonunun tam koreografisi ve renkleri, kart görselleri, `.ics` ayrıntısı, kupa sayfası yerleşimi, sunucu mesajlarının adları, Sonnet/Haiku görev bölümü.
