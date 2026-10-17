# Kariyer Modu (Faz 3) — Tasarım

Tarih: 2026-10-17 · Durum: taslak, kullanıcı onayı bekliyor

## 1. Amaç ve neden

Padel Legends ücretsiz bir padel oyunu: herkes tek başına (AI'ya karşı) ve online (arkadaşlarla / açık maçlara katılarak) oynayabilsin. Oyuncuyu geri getiren şey **puan toplamak**: oynadıkça ve kazandıkça puan kazanır, puanla oyuncusunu geliştirir (antrenman), marketten raket, ayakkabı, kıyafet, top alır ve turnuva merdiveninde amatörden Premier Finals'a tırmanır.

Kullanıcının sözleri: "Yeni girenlerin değerleri oynadıkça artan… kıyafetleri, ayakkabısı ve diğer tüm padel ekipmanlarını zamanla puan karşılığı marketten alabilecek… galibiyete göre artan… oyun içinde aldığı puanlara göre… kaliteli raketlerle daha iyi oynansın… marketten daha iyi toplar."

İleride (bu fazda değil) ücretli kestirme düşünülüyor: puan biriktirmeden ekipman / özellik almak. Bu yüzden ekonomi tek bir veri dosyasından ayarlanabilir olmalı.

## 2. Hedefler, hedef dışı, kaçınılacaklar

**Hedefler (Faz 3a — bu belge):**
- Tarayıcıda saklanan kariyer profili + açık bilgilendirme.
- Kendi karakterini yaratma.
- Puan kazanma (maç, galibiyet, kazanılan sayı/oyun, turnuva derecesi).
- Antrenman (oyuncu özelliği yükseltme) ve market (raket, ayakkabı, kıyafet, top).
- Ekipmanın oyuna gerçek etkisi.
- AI'ya karşı turnuvalar: Americano, Mexicano, eleme (sabit partner), lig.
- Turnuva merdiveni ve sıralama.
- Online: açık maç listesi (lobi) + mevcut oda koduyla arkadaşla oynama; profil (karakter, ekipman, özellik) online maça taşınır, online maç da puan kazandırır.

**Hedef dışı (Faz 3b / sonra):** hesap/giriş ekranı ve sunucuda profil, rezervasyonlu maçlar, online turnuvalar, ücretli içerik, hile koruması, sezonluk puan düşümü.

**Kaçınılacaklar (çalışsa bile başarısızlık sayılır):**
- Puan toplamanın sıkıcı/yavaş hissettirmesi (hedef tempo §5.4).
- AI-AI turnuva maçlarını oyuncuya izletmek / beklettirmek — bunlar anında simüle edilir.
- Mevcut hızlı maç, eğitim, online oda ve tekrar özelliklerinin bozulması.
- Profilin sessizce kaybolması (bilgilendirme + yedek indir/yükle şart).

## 3. Kısıtlar

- Plain ES modules, framework yok. `src/game.js`, `physics.js`, `rules.js`, `ai.js` sunucuyla paylaşılıyor → DOM/three importu yok. Yeni saf mantık modülleri (`career.js` ekonomi kısmı, `tournament.js`) de DOM'suz olmalı ki `node:test` ile test edilsin.
- Her kural/fizik değişikliğine bir test (`npm test`).
- Intel HD 620: yeni ekranlar 2D DOM; ek 3D sahne yok (mevcut oyuncu önizlemesi yeniden kullanılır).
- Arayüz dili İngilizce (agy-07 ile tam İngilizce oldu).
- Mevcut veri: `data/characters.json` (26 karakter, görünüm + `stats`), `data/rackets.json` (12 raket: `stats.power/control/spin/sweetSpot`, `tier`, `price`), `data/tournaments.json` (6 format + `circuit` iskeleti), `data/venues.json`.
- Bugün oyunda kullanılan değerler: oyuncu `speed`, `power`, `control`; raket `power`, `control` (`game.js:77-78, 160`). `volley`, `smash`, `stamina`, raket `spin`, `sweetSpot` henüz etkisiz.

## 4. Kararlar

### 4.1 Profil ve saklama (kullanıcı kararı: ilk aşamada tarayıcı)
- `localStorage` anahtarı `padel.career.v1`, tek JSON nesnesi: `{ version, createdAt, player: {name, appearance…}, stats: {speed, power, control, volley, smash, stamina}, credits, rankingPoints, inventory: [itemId], equipped: {racket, shoes, shirt, shorts, headwear, ball}, history: {played, won, pointsWon}, circuit: {tournamentId: bestResult}, settings }`.
- Kariyer ilk açılışta ve profil ekranında görünür not: "Your progress is saved in this browser only. Clearing browser data deletes it. Accounts are coming later." + **Export / Import** (JSON dosyası indir/yükle) — kayıp ve cihaz değiştirme için. *(Opus kararı)*
- `localStorage` erişilemezse (gizli pencere) kariyer çalışır ama kaydedilemediği açıkça söylenir.
- Şema `version` alanıyla; ileride sunucuya taşınırken aynı JSON gönderilecek.

### 4.2 Karakter yaratma *(Opus kararı — kullanıcı "sen nasıl dersen")*
- Oyuncu mevcut 26 karakterden birini **şablon** seçer, sonra: isim, ülke, cinsiyet (şablona göre), ten rengi, vücut tipi, saç modeli + rengi, sakal, gözlük, sağlak/solak düzenler. Görünüm alanları `characters.json` şemasıyla aynı → `createAvatar` değişmeden çalışır.
- Düzenlenebilen görünüm (bugünkü avatar sisteminin desteklediği her şey): saç modeli (kısa/yandan ayrık, kazınmış, uzun, topuz, at kuyruğu, samuray topuzu, kel; uzun saçta kesim boyu ile küt), **saç rengi** (serbest renk seçici + hazır tonlar), **sakal** (yok / hafif / tam / keçi) ve **sakal rengi**, ten rengi, vücut tipi (ince, atletik, kaslı, iri, uzun, minyon) ve boy, yüz genişliği, gözlük ve çerçeve rengi, makyaj, saç bandı / vizör.
- Görünüm **istendiği an ücretsiz** değiştirilebilir (Profile → Edit look); oyun gücüne etkisi yoktur. *(Opus kararı; kullanıcı saç/sakal/renk değişikliğini istedi)*
- Başlangıç özellikleri şablondan **bağımsız**: hepsi 4 (AI "club" ≈ 6). Böylece gelişim hissedilir.
- Forma/şort/ayakkabı rengi başlangıçta "starter kit"; daha fazlası marketten.

### 4.3 Para birimleri *(Opus kararı)*
- **Credits (puan):** harcanır. Market ve antrenman bununla. UI'da "Points" değil "Credits" yazılır ki sıralama puanıyla karışmasın.
- **Ranking points:** harcanmaz; yalnız turnuvalardan; turnuva kilitlerini açar ve dünya sıralamasını belirler.

### 4.4 Kazanma kuralları (değerler `data/economy.json`)
Maç sonunda (kariyer hızlı maçı, turnuva maçı, online maç):
- `base` (oynadığın için) + `perGameWon` × kazanılan oyun (tenis skorunda) **veya** `perPointWon` × kazanılan sayı (ralli puanlamalı maçlarda) + `winBonus` (kazanırsan).
- AI zorluk çarpanı: rookie 0.6 · club 1 · pro 1.4 · legend 1.8.
- Turnuva ödülü: dereceye göre credits + ranking points (tablodan).
- Maç sonu ekranı kalem kalem gösterir ("Played +20, 5 games × 4 = +20, Win +40, Club ×1 → +80").
- Serbest oyun menüsündeki (kariyer dışı) maçlar puan kazandırmaz; eğitim de kazandırmaz. *(Opus kararı: kariyerin dengesi tek yerden kontrol edilsin)*

### 4.5 Antrenman (oyuncu özellikleri)
- 6 özellik: speed, power, control, volley, smash, stamina; 1–10 arası, başlangıç 4.
- Her seviye bir öncekinden pahalı (`economy.json` → `training.cost[level]`).
- Etkiler (paylaşılan simülasyonda, testli):
  - `speed`: zaten koşu hızı (`game.js:160`).
  - `power` / `control`: zaten vuruş hızı / isabet.
  - `volley`: file önü (top sekmeden) vuruşlarda isabet + erişim.
  - `smash`: smaç/bandeja/víbora hızı ve isabeti.
  - `stamina`: uzun rallide (ör. 8+ vuruş) hız/isabet düşüşünü azaltır.

### 4.6 Market ve ekipman etkileri
Tüm ürünler `data/shop.json` (raketler mevcut `rackets.json`'da kalır, market onu okur). Her ürün: `id, type, name, tier (unlock), price, …etki`.
- **Raket:** mevcut 12 + gerçekçi malzeme açıklaması (çekirdek: soft/medium/hard EVA veya foam; yüzey: fiberglass / 3K / 12K / 18K carbon; şekil: round/teardrop/diamond; ağırlık, denge). Etkiler:
  - `power` → top hızı, `control` → isabet (mevcut).
  - `sweetSpot` → zamanlama toleransı: biraz geç/erken vuruşta hız/isabet kaybı az.
  - `spin` → topspin/slice miktarı.
- **Ayakkabı:** `speed` (+%), `agility` (yön değiştirme/ivme). Başlangıç ayakkabısı nötr.
- **Kıyafet:** forma, şort, ayakkabı rengi, saç bandı/vizör — yalnız görünüm. Faz 3a'da renk + mevcut başlık aksesuarları (`kitMaterial()` ve `addHeadwear` bugün bunları destekliyor); desenli formalar sonra. *(Opus kararı: giyim güç vermez; güç raket/ayakkabı/antrenmandan gelir)*
- **Top:** Standard (başlangıç, daha yavaş, affedici), Pro (daha hızlı, canlı sekme), Pro S (en hızlı). Etki: fizikte top hız/sekme çarpanı. Oyuncunun **kendi kariyer maçlarında** seçtiği "maç topu"; online'da oda sahibinin topu kullanılır.
- Kilit: ürünler `tier` ile sıralama puanına bağlı (amateur / club / regional / national / pro / elite).
- Bireysel kariyer başlangıcı: Starter Nova raket, starter ayakkabı, Standard top, starter kit.

### 4.7 Maç formatları
- Mevcut tenis skorlaması korunur (eleme, lig).
- **Yeni: ralli puanlaması** `rules.js` → `newMatch({ pointsTo: 16|24|32 })`: her ralli bir sayı, toplam sayıya ulaşılınca biter; servis her 4 sayıda karşıya geçer (Americano geleneği: 2–4 servis). Testli.
- Americano/Mexicano'da her oyuncu, takımının aldığı sayıyı bireysel hanesine yazar (10–14 biten maçta 10 ve 14).

### 4.8 Turnuvalar (AI'ya karşı)
Saf modül `src/tournament.js` (DOM'suz, testli): katılımcılar, tur eşleştirmeleri, sonuç girişi, sıralama tablosu, final derecesi.
- **Americano** (8 oyuncu, 7 tur, her turda partner değişir; maç 16 sayı): oyuncu her turda 1 maç oynar.
- **Mexicano** (8 oyuncu, 5 tur; 1. tur kura, sonra sıralamaya göre 1+4 vs 2+3 eşleşme).
- **Knockout** (sabit AI partner; 8 veya 16 çift; maç 1 set ya da 3 set).
- **League** (round robin; 4–6 çift).
- (King of the Court, Mixed: sonra.)
- Oyuncunun **kendi** maçları gerçek oynanır; diğer kortlardaki AI-AI maçları özelliklere dayalı olasılıkla **anında simüle** edilir.
- Turnuva ortasında çıkılırsa ilerleme kaydedilir; kaldığı turdan devam eder.
- Çiftler kariyer maçında ve sabit partnerli turnuvalarda oyuncu partnerini o kademede açık olan kadrodan seçer; seçmezse önerilen (kademeye uygun) partner gelir. *(Opus kararı)*
- Partnerler / rakipler 26 karakterlik kadrodan + ihtiyaç olursa üretilmiş AI oyunculardan; AI seviyesi turnuva kademesine göre.

### 4.9 Turnuva merdiveni ve sıralama
Gerçek FIP/Premier Padel 2025 oranları (şampiyon puanı): Bronze 40, Silver 80, Gold 150, Platinum 300, P2 600, P1 1000, Major 2000, Premier Finals 1500.
- Merdiven: Club Americano (0 gerekli) → Club League → FIP Bronze → FIP Silver → FIP Gold → FIP Platinum → P2 → P1 → Major → Premier Finals (davetiye: sıralamada ilk 8).
- `tournaments.json` → `circuit` bu kademelere göre yeniden düzenlenir: `minRankingPoints`, `entryFee` (credits), ödül tablosu (derece → credits + ranking points), AI seviyesi, format, mekan.
- **Dünya sıralaması:** AI oyuncuların sabit puanları + oyuncu; oyuncu yükseldikçe sırası görünür. Puanlar birikir (sezon düşümü yok — hedef dışı).

### 4.10 Online (Faz 3a kapsamı)
- Sunucuya **açık maç listesi**: oda kurarken "public" seçilirse listede görünür (mod, mekan, boş koltuk, kurucu adı); listeden tek tıkla katılma. Oda kodu ile özel oyun aynen kalır.
- Katılırken profilin karakteri, özellikleri ve ekipmanı gönderilir (istemciye güvenilir — hile koruması hedef dışı, arkadaş oyunu için kabul).
- Online maç sonunda §4.4 kurallarıyla puan (AI çarpanı yerine sabit 1.2) — istemci tarafında hesaplanır.

### 4.11 Arayüz akışı
Ana menüye **CAREER** girişi (mevcut 5 sekmeli menünün yanında). Kariyer hub ekranı:
- Üstte profil kartı: karakter önizlemesi (mevcut 3D önizleme), isim, credits, ranking points, dünya sırası.
- Kartlar: **Play** (kariyer hızlı maçı: tekler/çiftler, AI seviyesi, mekan) · **Tournaments** (merdiven; kilitli olanlar gerekli puanla) · **Training** · **Shop** · **Locker** (kuşan/değiştir) · **Ranking** · **Profile** (düzenle, export/import, saklama notu).
- Maç sonu: ödül dökümü ekranı → hub'a ya da turnuva tablosuna dönüş.
- Klavye/fare + Xbox kolu ile gezilebilir (mevcut menü kalıbıyla aynı).

## 5. Builder'a bırakılanlar ve öneriler

### 5.1 Dosya düzeni (öneri)
`src/career.js` (profil oku/yaz, ekonomi hesapları — DOM'suz kısım ayrı fonksiyonlar), `src/careerui.js` (ekranlar), `src/tournament.js`, `data/economy.json`, `data/shop.json`; `server/server.js` lobi listesi. Testler: `test/career.test.js`, `test/tournament.test.js`, ralli puanlaması `test/rules.test.js`'e, ekipman/özellik etkileri `test/game.test.js` / `physics.test.js`'e.

### 5.2 Ekipman etkisinin büyüklüğü
En iyi raket + max özellik, başlangıca göre fark edilir ama ezici olmayan avantaj vermeli (kaba hedef: top hızı +%15, isabet sapması −%30, koşu hızı +%12). Kesin katsayılar builder'ın; `tools/sim.js` ile dengelenmeli.

### 5.3 Ekonomi rakamları
Başlangıç değerleri builder'ın, şu tempoya göre:

### 5.4 Hedef tempo
- İlk antrenman yükseltmesi: 1–2 maçta.
- İlk iyi raket (club tier): ~20–30 maç.
- FIP Gold'a erişim: ~15–20 saat; Premier Finals: uzun hedef (50+ saat).
- Bir kariyer maçı 3–6 dakika (ralli puanlaması 16 sayı ya da 1 set).

## 6. Fazlama önerisi
1. Profil + karakter yaratma + hub + kariyer hızlı maçı + kazanma + maç sonu ekranı.
2. Antrenman + market + locker + ekipman/özellik etkileri (testli).
3. Ralli puanlaması + `tournament.js` + Americano/Mexicano/Knockout/League + merdiven + sıralama.
4. Online lobi listesi + profilin online taşınması.
Her adım sonunda oynanabilir ve commit edilir.
