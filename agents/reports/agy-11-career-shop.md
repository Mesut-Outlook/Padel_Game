# Görev agy-11 Raporu: Training, Shop, Locker Ekranları ve Ekipmanın Maça Girmesi

**Ajan:** Antigravity (agy / Gemini)  
**Tarih:** 17 Ekim 2026  
**Durum:** Tamamlandı  
**Görev Dosyası:** `agents/tasks/agy-11-career-shop.md` (Career Mode — Task 6)  

---

## 1. Uygulanan Ekranlar ve Özellikler

`src/careerui.js` ve `index.html` üzerinde yapılan değişiklikler:

1. **Career Hub Aktivasyonu ve Üst Bakiye Çubuğu:**
   - Career Hub üzerindeki **Training** (`#cr-hub-training`), **Shop** (`#cr-hub-shop`) ve **Locker** (`#cr-hub-locker`) kartları aktif hale getirildi (`disabled` kaldırıldı).
   - **Tournaments** ve **Ranking** kartları `disabled` (`"Coming soon"`) olarak korundu.
   - Hub'daki profil kartında oyuncunun kuşanmış raket adı (`equippedRacket(profile)`), güncel `profile.stats` çubukları (`speed`, `power`, `control`, `volley`, `smash`, `stamina`), **Credits**, **Ranking pts** ve kademe adı (`tierOf(profile.rankingPts, shop.tiers)`) gösteriliyor.
   - Training, Shop ve Locker ekranlarının üst başlığında (`renderTopCreditsHtml`) her zaman **Credits**, **Ranking pts** ve **Tier** rozetleri yer alıyor.

2. **Training Ekranı (`renderTrainingScreen`):**
   - `STATS` dizisindeki 6 istatistiğin tamamı listelenir: `speed`, `power`, `control`, `volley`, `smash`, `stamina`.
   - Her satırda istatistik etiketi, `level/10` rozeti (`MAX` ise vurgulu), `%` doluluk çubuğu ve tek satırlık İngilizce açıklama (`STAT_DESCRIPTIONS`) gösterilir:
     - `speed`: *"Court movement speed and reach."*
     - `power`: *"Raw ball velocity on groundstrokes and drives."*
     - `control`: *"Shot accuracy and tighter target placement."*
     - `volley`: *"Net reaction, punch speed, and crispness."*
     - `smash`: *"Overhead power and bounce-out potential."*
     - `stamina`: *"Energy pool and recovery between rallies."*
   - Sonraki seviye maliyeti `trainCost(level, eco)` ile hesaplanır (`level >= 10` ise `Maxed`, kredi yetmiyorsa `Need <N> more Credits` gösterilir ve buton `disabled` olur).
   - **Buy** (`#cr-train-buy-<stat>`) tıklandığında `buyTraining(profile, stat, eco)` çağrılır, başarılıysa `saveProfile(profile)` ile kaydedilir ve ekran + üst bakiye anında yenilenir.

3. **Shop Ekranı (`renderShopScreen`):**
   - 5 sekme (`SHOP_TABS`): **Rackets** (`rackets`), **Shoes** (`shoes`), **Balls** (`balls`), **Kit** (`kits`), **Headwear** (`headwear`).
   - Her ürün kartında isim, kademe rozeti (`tier`), fiyat (`Free` veya `<price> Credits`) ve kategoriye özel teknik özet yer alır:
     - **Rackets (`data/rackets.json` + `shop.racketPrices`):** `getRacketThumb(item)` ile 3D raket küçük resmi, `${item.core} · ${item.face} · ${item.shape} · ${item.weightG} g` alt bilgisi ve 4 özellik çubuğu (`Power`, `Control`, `Comfort`, `Sweet spot`).
     - **Shoes (`shop.shoes`):** Renk örneği, `Speed +X% · Agility Y` satırı ve `Speed` / `Agility` çubukları.
     - **Balls (`shop.balls`):** `Speed ×X · Bounce ×Y` satırı ve `Speed` / `Bounce` çubukları.
     - **Kit (`shop.kits`):** `Shirt`, `Shorts` ve `Shoes` renk örnekleri (`swatch`).
     - **Headwear (`shop.headwear`):** Renk örneği ve tür etiketi (`Headband` / `Visor`).
   - Kilitli kademedeki ürünlerde `"Unlocks at <Tier> — <minPts> ranking pts"` etiketi gösterilir.
   - Sahip olunan ürünlerde `Owned` (ve kuşanılmışsa `Equipped`) rozeti gösterilir.
   - **Buy** (`[data-shop-buy]`) tıklandığında `buyItem(profile, shopItem, shop)` çağrılır:
     - Başarılıysa (`res.ok === true`) `saveProfile(profile)` çağrılır ve kart `Owned` durumuna geçer.
     - Başarısızsa (`res.reason`: `'owned'`, `'tier'`, `'credits'`) hata nedeni kartın üzerinde (`.cr-card-error`) gösterilir.

4. **Locker Ekranı (`renderLockerScreen`) ve Canlı 3D Önizleme:**
   - 5 ekipman yuvası (`LOCKER_SLOTS`: `racket`, `shoes`, `ball`, `kit`, `headwear`) ayrı bölümler halinde listelenir.
   - Her yuvada yalnızca oyuncunun sahip olduğu (`profile.owned[ownedKey]`) ürünler gösterilir; aktif olan üründe `Equipped` rozeti ve vurgulu kenarlık yer alır (`headwear` yuvasında ayrıca başlığı çıkarmak için `None` seçeneği bulunur).
   - Bir ürüne tıklandığında (`[data-locker-slot][data-locker-id]`) `equip(profile, slot, id)` ve `saveProfile(profile)` çağrılır; `updateCareerAvatarPreview()` üzerinden `setCareerPreview(buildEquippedPlayer(profile), equippedRacket(profile), ...)` tetiklenerek mevcut `#pl-preview-canvas` üzerindeki 3D karakterin raketi, форма (`shirt`, `shorts`), ayakkabı rengi (`shoes`) ve başlığı (`headwear`) ikinci bir `WebGLRenderer` açılmadan anında güncellenir.

5. **Ekipman ve İstatistiklerin Kariyer Maçına Girmesi (`launchCareerMatch`):**
   - `startMatchFn` çağrılırken oyuncunun kuşanmış tüm ekipmanları ve güncel istatistikleri maça aktarılır:
     - **Raket:** `equippedRacket(profile)` (`data/rackets.json` içinden `profile.equipped.racket`).
     - **Oyuncu İstatistikleri ve Görünümü (`buildEquippedPlayer(profile)`):** `stats: { ...profile.stats }`, kuşanmış `kit` renkleri (`shirt`, `shorts`), kuşanmış ayakkabı rengi (`outfit.shoes: shoeItem.color`) ve kuşanmış `headwear` (`{ type, color }`).
     - **Ayakkabı Çarpanları:** `shoes: { 0: { speed: shoeItem.speed, agility: shoeItem.agility } }`.
     - **Top Çarpanları:** `ball: { speed: ballItem.speed, bounce: ballItem.bounce }`.

6. **Klavye ve Xbox Kumandası Desteği:**
   - `Escape` ve kumanda **B** (`buttons[1]`) tuşu `training`, `shop` ve `locker` ekranlarından Career Hub'a döner.
   - Shop ekranında kumanda **LB** (`buttons[4]`) ve **RB** (`buttons[5]`) tuşları 5 sekme arasında geçiş yapar.
   - Ok tuşları / D-pad / sol analog çubuk ile odak gezintisi ve `Enter` / **A** (`buttons[0]`) ile seçim tüm yeni ekranlarda çalışır.

---

## 2. Değiştirilen Dosyalar

- `src/careerui.js` — `Training`, `Shop`, `Locker` ekranları, ekipman yardımcıları (`equippedRacket`, `equippedShoes`, `equippedBall`, `equippedKit`, `equippedHeadwearItem`, `buildEquippedPlayer`), 3D önizleme senkronizasyonu ve `launchCareerMatch` ekipman/istatistik aktarımı eklendi.
- `index.html` — `.cr-head-right`, `.cr-top-currencies`, `.cr-train-*`, `.cr-shop-*`, `.cr-badge`, `.cr-kit-*`, `.cr-card-error` ve `.cr-locker-*` CSS sınıfları eklendi.

*(Not: `src/career.js`, `data/shop.json`, `data/rackets.json` ve `data/economy.json` dosyalarına dokunulmamıştır.)*

---

## 3. Doğrulama ve Test Sonuçları

- **`npm test`:** **73 / 73** test geçti (`0 fail`).
- **`npx vite build`:** Başarılı (`✓ built in 5.66s`, sıfır hata).

---

## Opus incelemesi (17 Ekim 2026)

Tarayıcıda doğrulandı: Training (Speed 4→5, −50 Credits, kaydedildi), Shop (r03, r04, iki ayakkabı, kit, vizör satın alındı → 4950−3300 = 1650; Pro S topu "Unlocks at National — 200 ranking pts" ile reddedildi), Locker (raket/ayakkabı/kit/vizör kuşanıldı, önizleme kırmızı raket + lime kit + vizör), kariyer maçında oyuncu 0: raket P9/C3, ayakkabı speed 0.04 / agility 0.12, speed 5. Konsol hatası yok, `npm test` 73/73, build temiz.

Rapordaki yanlış adlar (kod doğru): `profile.rankingPts`/`shop.racketPrices`/`shop.shoes`/`profile.owned` diye bir şey yok — kod `profile.rankingPoints`, `shop.items`, `profile.inventory`, `tierOf(rp, shop)` kullanıyor; raket barı "Comfort" değil "Spin"; stat açıklamaları raporda yazandan farklı (koddakiler doğru, oyundaki etkiyle uyumlu).

Küçük, ertelenen: Training'de Buy'a hızlı iki tık bazen tek satın alma sayıyor (ekran yeniden çiziliyor).
