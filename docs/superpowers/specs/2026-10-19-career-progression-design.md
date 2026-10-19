# Kariyer İlerlemesi: Seviye, Ekonomi, Çanta ve Su — Tasarım

*2026-10-19 · Opus · kullanıcı soruları atlattı ("araştır ve tasarım belgesini yaz"); bu belgedeki kararların çoğu Opus kararıdır ve öyle işaretlidir.*

## 1. Amaç ve neden

Kullanıcının isteği (özet): kazanılan puan, maça girme ve ürün alma arasında **mantıklı bir bağ** olsun; oyun **hep bir maç daha** oynatsın. İyi raket/ayakkabı/aksesuar **baştan verilmesin**, oyuncu seviyesi yükseldikçe ve Credits'i yettikçe açılsın. Yeni kariyer **ortalama** değerlerle başlasın, zamanla gelişsin; oynamayınca bir şeyler geriye düşsün (diğer oyunlara bakılarak karar verilecek). Friendly'de her karakterin güçlü/zayıf yanları olsun ve oyuncuya bunları nasıl geliştirebileceği söylensin. Çantada enerji yiyeceği ve su olsun; enerji düşünce yemeye, su bitince markete yönlendirilsin; ikisi de Credits ile stoklanabilsin. Seviyeler kademe kademe Master/Legend'a kadar gitsin. Playtomic puanı nasıl hesaplanıyor, aktarılabilir mi, benzerini yapabilir miyiz — araştırılsın.

Bugünkü durum (kod): kariyer profili `padel.career.v1` (`src/career.js`), maç ödülü Credits (`data/economy.json`: taban 20 + oyun başı 4 + galibiyet 40, AI çarpanı rookie 0.6 … legend 1.8), turnuvalar **sıralama puanı** veriyor ve turnuva girişini + market kademelerini (`shop.tiers`: amateur 0 … elite 1500) açıyor. Yeni profil tüm statlarda **4** ile başlıyor (roster ortalaması ~7, oyunda 6 = "nötr"). Enerji ürünleri (muz/izotonik/jel) bugün maç başında otomatik tüketiliyor (`useFuel`). Su yok. Seviye/derece kavramı yok.

## 2. Hedefler, hedef dışı, kaçınılacaklar

**Hedefler**
- Playtomic'e benzeyen, **0.50–7.00** arası bir **oyuncu seviyesi** + **güvenilirlik %**; her kariyer maçında (hızlı maç, turnuva, online) güncellenir.
- Seviyeye bağlı **8 kademe** (Rookie → Legend); market ürünleri kademe ile açılır, Credits ile alınır.
- Ekonomi: her maç bir şey kazandırır; günün ilk galibiyeti, art arda maç serisi ve kademe atlama ödülleri "bir maç daha" hissi verir; bir sonraki iyi ürün ~6–20 maç uzaklıkta.
- Yeni kariyer ortalama (5) statlarla başlar; statlar maç oynayarak (yavaş, bedava) ve antrenmanla (hızlı, Credits) artar; kademe stat tavanını belirler; maç sonu koç ipucu en zayıf yanı ve nasıl geliştirileceğini söyler.
- Oynamamanın bedeli yumuşak: seviye düşmez; **form** ve **sıralama puanı** zamanla azalır, güvenilirlik düşer.
- **Çanta:** yiyecek + su; başlangıçta herkesin çantasında bir şey var; enerji düşünce taraf değişiminde yeme önerisi; **hidrasyon** ayrı bir değer; su bitince markete yönlendirme; stok sınırı.
- Friendly: istenen karakter seçilir; karakter kartında güçlü/zayıf yanlar ve bir oyun ipucu.

**Hedef dışı**
- Gerçek Playtomic hesabıyla otomatik bağlantı (aşağıda §4.4: herkese açık API yok).
- Hesap/sunucuda profil saklama, gerçek para, mikro ödeme.
- Online kariyer maçlarında hile önleme (bugünkü gibi güvene dayalı; sunucu sadece değerleri sınırlar).

**Kaçınılacaklar (teknik olarak çalışsa bile başarısızlık sayılır)**
- Para ile güç satın alınıyormuş hissi (Credits yalnızca oyundan kazanılır; en iyi ürünler kademe kilidi olmadan alınamaz).
- Bir haftalık aradan dönen oyuncunun eşyalarını/seviyesini kaybetmesi.
- Bir sonraki ürün için 30+ maç gerektiren duvarlar.
- Maç içinde sürekli açılan pencereler; yeme/su önerisi yalnızca taraf değişiminde ve kısa.

## 3. Araştırma özeti

| Konu | Bulgu | Bu oyuna etkisi |
|---|---|---|
| Playtomic seviyesi | 0–7 ölçek, 0.25'lik adımlarla gösterim; başlangıç seviyesi tek seferlik anketle; her **rekabetçi** maçtan sonra çiftlerin ortalama seviyesine göre beklenen sonuç ile gerçek sonuç karşılaştırılır; güçlü çifti yenmek çok, zayıfı yenmek az kazandırır; yanında **güvenilirlik %** var — düşükken seviye hızlı, yüksekken yavaş değişir; dostluk maçları seviyeyi **hiç** değiştirmez. Formülün sabitleri yayımlanmamış; bazı kaynaklar skor farkının da hesaba girdiğini söylüyor. | §4 seviye formülü bu yapıyı taklit eder; sabitler bizim. |
| Playtomic bant adları | <1 Initiation · 1.0–1.49 Beginner · 1.5–2.4 Initiation Intermediate · 2.5–3.4 Intermediate · 3.5–4.4 Intermediate High · 4.5–5.4 Intermediate Advanced · 5.5+ Competition | §5 kademe adları ve sınırları buna dayanır, üstüne Master/Legend eklenir. |
| Playtomic verisini aktarma | Oyuncu seviyesi için herkese açık bir API bulunamadı ("Playtomic API" aramaları 2012'deki ilgisiz bir oyun-analitiği şirketine çıkıyor). Sayfa kazıma kullanım şartlarına aykırı olabilir. | Otomatik aktarma yok; oyuncu **kendi seviyesini elle** girebilir (§4.4). |
| FIP / Premier Padel sıralaması | 52 haftalık kayan pencere; bir yıl önce aynı haftada kazanılan puan savunulmazsa silinir. | Turnuva **sıralama puanları** kayan pencereyle eskir (§7.2). |
| League of Legends | Puan düşüşü (decay) yalnızca üst liglerde: Diamond 28 gün sonra başlar, her maç 7 gün biriktirir (en çok 28), sonra günde 50 LP düşer; Master+ 14 gün, günde 75 LP. | "Oynamayana ceza" yalnızca tepe kademelerde mantıklı; alt kademelerde oyuncuyu kaçırır. |
| Glicko | Oynamayan oyuncunun puanı **korunur**, belirsizliği (RD) büyür; dönünce ilk maçlar puanı daha çok oynatır. | Seviye düşmez, **güvenilirlik** düşer (§4.3). |
| Antrenmansızlık (detraining) | Tenis oyuncularında ~5 hafta aradan sonra hız/güç/aerobik kapasitede anlamlı düşüş; ilk 3 haftada hızlı, sonra yavaşlar; beceri (teknik) daha kalıcı. | Kısa süreli **form** düşüşü (§7.1): stat ve seviye kalıcı, form geçici. |
| TopSpin 2K25 MyCAREER | Karakter tüm özelliklerde 100 üzerinden 30 ile başlıyor; XP özellik geliştirir ve koç/ekipman açar; para birimi koç ve ekipman alır; enerji/yorgunluk yönetimi var (çok sert bulunmuş: dinlenmek için "aylar" beklemek). | İki eksenli ilerleme (seviye = kilit, Credits = satın alma) doğru; enerji yönetimi **maç içinde** kalsın, kariyer takvimini kilitlemesin. |
| Günlük ödüller (F2P) | Tekrar eden giriş/oyun ödülü alışkanlık yaratır; artan seriler en büyük ödülü sona koyar; kaçırılan günün sert cezası oyuncu kaybettirir. | Günün ilk galibiyeti + oturum içi seri; kaçırınca ceza yok (§6.2). |
| Padel beslenme | Uzun maçta saatte 30–60 g karbonhidrat, her molada ~200 ml (sıcakta 400 ml+) elektrolitli sıvı; jel hızlı, muz yavaş salınım (2026-10-18 tasarımı §4.1). | Su ve yiyecek ayrı değerler; isotonik ikisine birden yarar (§8). |

Kaynaklar: [Playtomic — padel levels](https://playtomic.com/blog/padel-levels), [StudyPadel — Playtomic levels](https://www.studypadel.com/articles/padel-levels), [Padeli — Playtomic level](https://padeli.com/get-started/glossary/playtomic-level/), [The Padel Shop NZ — Playtomic ranking](https://www.thepadelshop.co.nz/blogs/what-padel-equipment-do-you-need/%F0%9F%9A%80-the-padel-level-secret-revealed-why-you-need-to-know-your-playtomic-ranking), [Bounce — padel rating converter](https://www.bounce.game/padel-rating-converter), [FIP — ranking system & points breakdown](https://www.padelfip.com/ranking-system-points-breakdown/), [Red Bull — Premier Padel rankings](https://www.redbull.com/us-en/premier-padel-battle-to-top-world-rankings), [Riot — placements, demotions and decay](https://support.riotgames.com/league-of-legends/gameplay/placements-promotions-series-demotions-and-decay), [Riot — apex tiers](https://support.riotgames.com/league-of-legends/gameplay/master-grandmaster-and-challenger-the-apex-tiers), [Metricgate — Elo vs Glicko](https://metricgate.com/blogs/elo-vs-glicko-rating-system/), [ECF — Elo vs Glicko (PDF)](https://www.englishchess.org.uk/wp-content/uploads/2012/04/Elo_vs_Glicko.pdf), [BJSM — tennis detraining](https://bjsm.bmj.com/content/41/11/705), [Roy Stevenson — tennis fitness](https://roy-stevenson.com/tennis-fitness.html), [2K — TopSpin 2K25 modes](https://newsroom.2k.com/news/topspin-2k25-game-mode-details-revealed), [Shacknews — TopSpin 2K25 review](https://www.shacknews.com/article/139582/topspin-2k25-review-top-spin), [Game Developer — designing daily rewards](https://www.gamedeveloper.com/business/the-science-craft-of-designing-daily-rewards-and-why-ftp-games-need-them).

## 4. Oyuncu seviyesi (Padel Legends Level) *(Opus kararı)*

### 4.1 Değerler
- `profile.level` 0.50–7.00 (iki ondalık, Playtomic gibi gösterilir: **3.42**), `profile.reliability` 0–1 (gösterim **%**).
- Kariyerin **her** maçı seviyeyi değiştirir: hızlı maç, turnuva maçları, online kariyer maçları. Friendly ve eğitim **değiştirmez**.
- AI seviyeleri: `rookie` 1.0, `club` 2.5, `pro` 4.0, `legend` 5.8; her roster karakteri kendi stat ortalamasına göre ±0.5 kaydırılır (ort. 7 = kayma yok; her stat puanı ±0.25). Online'da insan rakibin seviyesi lobide paylaşılır (sunucu 0.5–7.0'a sıkıştırır); yoksa 2.5 sayılır.

### 4.2 Maç sonrası güncelleme
```
myPair  = takımımdaki oyuncuların seviye ortalaması (tekli: benim seviyem)
oppPair = rakip takımın seviye ortalaması
E = 1 / (1 + 10^((oppPair − myPair) / 1.5))          // 1.5 seviye fark ≈ 10'a 1 favori
S = 0.75 × (kazandıysam 1, değilse 0) + 0.25 × payım   // pay = kazandığım oyun / toplam oyun (ralli puanlamada sayı)
K = 0.25 × (1 − 0.75 × reliability)                   // yeni oyuncu hızlı, oturmuş oyuncu yavaş hareket eder
Δ = K × (S − E);  level = clamp(level + Δ, 0.50, 7.00)
reliability = min(1, reliability + 0.05)
```
Örnek: 2.50 seviye, güvenilirlik %20, kulüp AI'ını (2.50) 6-3 yenince: S = 0.917, E = 0.5, K = 0.2125 → **+0.09**. Aynı maçı kaybetmek (3-6): S = 0.083 → **−0.09**. Bir kademe (≈1.0 seviye) ~10–15 galibiyet; tepe kademeler yalnızca legend AI'larını yenerek aşılır (legend 5.8 → 7.0'a yaklaştıkça E büyür, Δ küçülür).

### 4.3 Hareketsizlik *(Opus kararı; Glicko modeli)*
- Seviye **asla** oynamadığı için düşmez.
- Son kariyer maçından 14 gün sonra güvenilirlik günde 0.01 düşer, en az 0.30 (dönüşte ilk maçlar seviyeyi daha hızlı oturtur).

### 4.4 Başlangıç seviyesi ve Playtomic
Kariyer oluştururken yeni bir adım: **"What's your padel level?"**
1. **Anket** (5 soru, Playtomic tarzı): ne kadar süredir oynuyorsun · arka camı kullanabiliyor musun · bandeja/víbora · fileyi tutabiliyor musun · turnuva oynuyor musun → 0.5–4.0 arası tahmin.
2. **"I have a Playtomic level"**: oyuncu kendi seviyesini elle yazar (0.50–7.00); oyunda başlangıç = `min(girilen, 4.50)` (oyunu yeni öğrenen birinin doğrudan Competition kademesinden başlamaması için), güvenilirlik %30. Metin: "We can't read your Playtomic account; type the level shown in the app."
3. **Atla** → 1.50, güvenilirlik %20.
Playtomic'e geri **yazma** yok; oyun içi seviye ayrı bir değerdir ve bunu ekranda söyler ("Padel Legends level — Playtomic-style, not synced").

## 5. Kademeler *(Opus kararı: Playtomic bantları + Master/Legend)*

| # | Kademe | Seviye | Playtomic karşılığı | Market kademesi (bugünkü `shop.tiers` adı) | Stat tavanı | Tipik rakip |
|---|---|---|---|---|---|---|
| 1 | **Rookie** | 0.50–0.99 | Initiation | amateur | 6 | rookie |
| 2 | **Beginner** | 1.00–1.49 | Beginner | amateur | 6 | rookie |
| 3 | **Club** | 1.50–2.49 | Initiation Intermediate | club | 7 | club |
| 4 | **Intermediate** | 2.50–3.49 | Intermediate | regional | 7 | club |
| 5 | **Advanced** | 3.50–4.49 | Intermediate High | national | 8 | pro |
| 6 | **Competition** | 4.50–5.49 | Intermediate Advanced | pro | 9 | pro |
| 7 | **Master** | 5.50–6.49 | Competition | elite | 10 | legend |
| 8 | **Legend** | 6.50–7.00 | (profesyonel) | elite | 10 | legend |

- **Market:** bir ürün, oyuncunun **ulaştığı en yüksek kademe** o ürünün kademesine eşit/üstündeyse satın alınabilir (seviye geri düşse bile açılan ürün kilitlenmez). Sahip olunan ürün hiç kaybolmaz.
- `shop.tiers` sıralama puanı eşikleri yerine kademe adlarına bağlanır; ürünlerin `tier` alanı yukarıdaki eşlemeyle kalır (amateur = Rookie/Beginner, club = Club, regional = Intermediate, national = Advanced, pro = Competition, elite = Master).
- **Kademe atlama:** tam ekran kısa kutlama + ödül (§6.2) + "Yeni açılanlar" listesi (ürünler, turnuvalar).
- Turnuva girişleri **sıralama puanıyla** kalır (gerçek FIP gibi), ama her turnuvaya en az kademe de eklenir (ör. Premier P1 için Master).

## 6. Ekonomi *(Opus kararı)*

### 6.1 Bugünkü kazanç ve fiyat (ölçüm)
Bir setlik kulüp maçı: galibiyet 6-3 ≈ 20 + 24 + 40 + stil ≈ **~95**, yenilgi 3-6 ≈ **~32** → ortalama **~65 Credits/maç** (rookie ×0.6 ≈ 40, pro ×1.4 ≈ 90, legend ×1.8 ≈ 115). En pahalı raket 12 000 = kulüpte ~185 maç → çok uzak. Ayakkabılar 300–7 500.

### 6.2 "Bir maç daha" ödülleri
- **Günün ilk galibiyeti:** o maçın Credits'i ×2 (gerçek günle; kaçırınca ceza yok).
- **Seri:** önceki kariyer maçının bitişinden 20 dakika içinde başlayan her maç +%10, en çok +%50 (oturum içi; ara verince sıfırlanır, ceza yok).
- **Kademe atlama ödülü:** `150 × yeni kademe no` Credits + çantaya 2 muz + 4 su (yer yoksa sınırda durur).
- **Yenilgi de öder:** taban + oyun başı Credits kalır (bugünkü gibi).
- Ödül ekranı her satırı ayrı gösterir (bugünkü `lastReward.lines` yapısı): "First win of the day ×2", "Streak +30%".

### 6.3 Fiyat hedefi
Kural: bir kademenin **orta** ürünü, o kademenin tipik kazancıyla **6–10 maç**; o kademenin **en iyi** raketi **15–20 maç**. Fiyatlar `data/shop.json` ve `data/rackets.json`'da bu kurala göre yeniden ayarlanır (builder tablo üretir, aşağıdaki aralıklar hedef):

| Kademe | Tipik kazanç/maç (seri+ilk galibiyet ortalamasıyla) | Orta ürün | En iyi raket |
|---|---|---|---|
| Rookie/Beginner | ~50 | 300–500 | 750–1 000 |
| Club | ~80 | 500–800 | 1 200–1 600 |
| Intermediate | ~90 | 600–900 | 1 400–1 800 |
| Advanced | ~115 | 700–1 150 | 1 700–2 300 |
| Competition | ~125 | 800–1 250 | 1 900–2 500 |
| Master/Legend | ~150 | 900–1 500 | 2 300–3 000 |

Antrenman maliyeti (§9) ve çanta sarf malzemesi (§8) maç başı kazancın en çok ~%15'i olacak şekilde.

## 7. Oynamamanın bedeli *(Opus kararı)*

### 7.1 Form
- `profile.form` 0 … −0.10. Son kariyer maçından 7 gün sonra günde −0.01 (en çok −0.10, 17. gün).
- Her kariyer maçı formu +0.03 geri getirir (0'a kadar); bir antrenman satın almak +0.02.
- Maçta etkisi: hız × (1 + form/2), hata × (1 − form) (form negatif olduğu için yavaşlar ve hata artar; en kötü %5 yavaş, %10 daha çok hata).
- Arayüz: profilde "Form: Sharp / Rusty (−6%)" ve hub'da "Play a match to shake off the rust".

### 7.2 Sıralama puanı
- Turnuvadan gelen her sıralama puanı kaydı tarihiyle saklanır; **90 gün** sonra silinir (FIP 52 haftanın oyun içi kısaltması). Dünya sıralaması mevcut toplamdan hesaplanır.
- Hub'da "Points expiring in 7 days: 120" uyarısı → turnuvaya yönlendirir.

### 7.3 Ne düşmez
Seviye, kademe, statlar, eşyalar, Credits.

## 8. Çanta, enerji ve su *(Opus kararı)*

### 8.1 Değerler ve ürünler
- Maçta her oyuncuda iki değer: **enerji** (bugünkü) ve yeni **hidrasyon** (0–1, maç başında 1).
- Hidrasyon, sayı oynanırken saniyede azalır, koşarken daha hızlı; dış mekânda (mekânın açık/kapalı bilgisi varsa) ×1.25. Hedef (builder ayarlar): su içmeden bir sette ~5. oyunda %30'un altına iner.
- Hidrasyon < 0.30 (**susuz**): sayı arası enerji toparlanması yarıya iner ve hız −%10; HUD'da enerji çubuğunun yanında küçük 💧 çubuk, susuzken yanıp söner.
- Çanta ürünleri (`data/shop.json`, `type: 'bag'`):

| Ürün | id | Kademe | Paket / fiyat | Etki (taraf değişiminde 1 adet) |
|---|---|---|---|---|
| Water bottle | `bag_water` | Rookie | 6 / 30 | hidrasyon +0.5 |
| Banana | `bag_banana` | Rookie | 5 / 60 | enerji +0.12 hemen, maçın kalanında yorulma ×0.95 |
| Isotonic drink | `bag_isotonic` | Club | 5 / 100 | hidrasyon +0.35 ve enerji +0.12 |
| Energy gel | `bag_gel` | Intermediate | 5 / 150 | enerji +0.22 hemen |

- Bugünkü `fuel_*` ürünleri (maç başında otomatik) bu çanta ürünlerine dönüşür; profil göçünde `supplies.fuel_banana` → `bag.bag_banana` vb.

### 8.2 Çanta ve sınırlar
- `profile.bag = { bag_water: n, bag_banana: n, … }`. Sınır: yiyecek toplamı **8**, içecek toplamı (su + isotonik) **8**. Marketten **"Pro bag"** (Advanced, 1 200 Credits) sınırı 16/16 yapar.
- **Başlangıç çantası:** yeni kariyer 4 su + 3 muz ile başlar; mevcut profiller göçte bunu alır.
- Satın almada sınır aşılamaz ("Bag full: 8/8 drinks").

### 8.3 Maç içinde
- Su tüketimi otomatik ve bedava değil: her **taraf değişiminde** çantada içecek varsa 1 su (yoksa isotonik) içilir; hiç içecek yoksa hidrasyon dolmaz ve ekranda **"Out of water — buy more in the Shop after the match"** çıkar.
- Yiyecek **teklif edilir**: taraf değişiminde enerji < 0.50 ve çantada yiyecek varsa ~6 saniyelik kutu: "⚡ 38% — eat a banana? **E** / pad **Y** / dokun". Kabul ederse 1 adet tüketilir (birden çok tür varsa en düşük kademedeki teklif edilir; sola/sağa ile değiştirilebilir — builder'a). Kutu kapanınca oyun sürer; maç beklemez.
- Enerji **çok** düşükse (< 0.25) ve yiyecek yoksa: "Your bag is empty — buy food in the Shop" (maçtan sonra ödül ekranında da).
- Ödül ekranı / hub: çantada içecek ≤ 2 veya yiyecek 0 ise **"Restock"** düğmesi doğrudan market çanta sekmesine götürür.
- **AI oyuncular** kendi sınırsız çantalarıyla aynı kuralı otomatik uygular (enerji < 0.5 iken taraf değişiminde yer; her değişimde su içer).
- **Friendly** ve eğitim: insanlar da sınırsız **varsayılan çanta** kullanır (su + muz), market yok; yeme önerisi aynı şekilde çıkar.
- **Online kariyer:** istemci "eat" girdisini taraf değişiminde gönderir; sunucu taraf değişimi başına kişi başı en çok 1 yiyecek + 1 içecek uygular ve etkileri §8.1 değerlerine sıkıştırır. Çanta sayımı istemcide (güvene dayalı).

## 9. Statlar ve gelişim *(Opus kararı)*

- **Başlangıç:** yeni kariyer tüm statlarda **5** ("ortalama"); anket/Playtomic seviyesi statları değiştirmez (seviye ayrı). Mevcut profillerde 5'in altındaki statlar 5'e çıkarılır.
- **Tavan:** kademe tablosu (§5). Tavandaki stat antrenmanda "Reach Advanced to train beyond 7" der.
- **Maçla gelişim (bedava, yavaş):** maçta kullanılan beceri XP kazanır — başarılı vole → volley, smaç/bandeja/víbora → smash, sert ve isabetli drive → power, hatasız 4+ vuruşluk ralli payı → control, koşulan mesafe → speed, 8+ vuruşluk ralliler → stamina. Hedef: normal oynayan biri en zayıf olmayan bir statını ~12–20 maçta 1 artırır. `profile.xp = { speed: n, … }`, eşik = 40 × mevcut stat.
- **Antrenman (Credits, hızlı):** bugünkü sistem; `training.start` 4 → 5; formül aynı, tavan kademeden gelir.
- **Koç ipucu (maç sonu):** maçta ölçülen en kötü alan (ör. vole hata oranı, smaç hatası, enerjinin 0.25 altında geçen süre, susuz kalınan süre) için tek satırlık öneri + düğme: "Your volleys missed 7 of 12 — **Train Volley** (180 Credits) or play at the net more". Enerji/su sorunu ise **Restock**.
- **Friendly karakter kartı:** en güçlü 2 ve en zayıf 1 stat etiketlenir + statlardan üretilen tek satırlık oyun ipucu (ör. "Smash 9 · Control 5 — finish at the net, keep rallies short"). Roster karakterleri geliştirilemez (Friendly'de); kart "Build your own player in Career" der.

## 10. Göç (mevcut profiller)
- `level` yoksa sıralama puanı kademesinden: amateur 1.0, club 2.0, regional 3.0, national 4.0, pro 5.0, elite 6.0; güvenilirlik %50; `form` 0.
- Statlar < 5 → 5. `bag` = başlangıç çantası + eski `supplies` dönüşümü. Sıralama puanı kayıtları bugünün tarihiyle başlar (90 gün sonra eski puan düşer).
- Kariyer sürümü `VERSION` 1 → 2; v1 profiller yüklenirken bir kez dönüştürülür ve yedeği `padel.career.v1.bak` olarak bırakılır.

## 11. Parçalar ve sıra *(Opus önerisi)*
1. **A — Seviye + kademeler + göç** (`career.js` saf fonksiyonlar + testler; kariyer oluşturmada seviye adımı; hub/profilde seviye kartı; market kilidi kademe ile). *Opus (kurallar) + Sonnet (ekranlar).*
2. **B — Ekonomi** (ilk galibiyet, seri, kademe ödülü, fiyat tablosu, form, sıralama puanı süresi). *Opus kurallar, Haiku fiyat verisi.*
3. **C — Çanta + hidrasyon** (`game.js` hidrasyon ve taraf değişimi, sunucu sınırları, yeme kutusu, market çanta sekmesi, friendly varsayılan çanta). *Opus (game/server), agy veya Sonnet (UI).*
4. **D — Stat gelişimi + koç ipucu + friendly karakter kartı.** *Sonnet + agy.*
Her parça ayrı commit, ayrı testler; her sayısal sabit `data/economy.json` veya `ENERGY` benzeri tek bir tabloda.

## 12. Okuyucu kontrolünden sonra netleşenler *(Opus kararları)*
1. **AI gücü ile seviye:** AI'nın oyunu iki şeyden gelir — davranış (`ai.js` `LV`: tepki, pozisyon, hata) ve roster statları (ort. ~7). Kariyer maçlarında rakip **ve AI partner** statları seçilen AI zorluğuna göre ölçeklenir: karakterin stat dağılımı korunur, ortalaması rookie **5**, club **6**, pro **7**, legend **8** olur (1–10 aralığında). AI'nın seviyesi (§4.1) bu ölçeklenmiş ortalamadan hesaplanır: `tier taban + (ölçekli ort − hedef ort) × 0.25`. Böylece 5 statla başlayan oyuncu rookie/club rakiplere denk, §4.2 ve §6.3 temposu tutar. Friendly'de roster statları olduğu gibi kalır.
2. **Stat tavanı** yalnızca oyuncunun **temel** statlarına (antrenman + XP) uygulanır; raket/ayakkabı/top etkileri ayrı ve tavanı aşabilir. Tavan **ulaşılan en yüksek kademeden** gelir.
3. **Yüksek başlangıç (anket/Playtomic ≥ 2.5):** başlangıçta `250 × (kademe no − 1)` Credits verilir (ör. Advanced = 1 000). Statlar yine 5; tavan kademeden. Rakip seçimi serbest olduğu için oyuncu kendine uygun AI'yı seçer; güvenilirlik %30 olduğundan seviye ilk 10 maçta gerçek gücüne hızla oturur (kaybederse hızla iner — bilinçli).
4. **Rakip ve partner seçimi serbest kalır** (bugünkü Play ekranı). Hub, kademeye uygun AI'yı "Recommended" olarak işaretler. Çiftlerde `myPair` = benim seviyem ile AI partnerin (madde 1'e göre ölçekli) seviyesinin ortalaması. Kolay rakiple çiftlik yapmak zaten az öder (rookie ×0.6, seviye kazancı küçük; günün ilk galibiyeti günde bir kez).
5. **Online kariyer:** bugünkü gibi kariyer ekranından açılan online oda = kariyer maçı; her istemci kendi profilini kendi günceller (Credits, seviye). Lobide her oyuncunun seviyesi `look` ile paylaşılır, sunucu 0.5–7.0'a sıkıştırır; rakip seviyesi lobiden okunur (yoksa 2.5). Form online'a gönderilmez. Hidrasyon ve taraf değişimi kuralları sunucunun dünyasında (`game.js` paylaşımlı) çalışır; yeme girdisi §8.3'teki sınırla.
6. **Form** yalnızca **çevrimdışı kariyer** maçlarında oyuncuya uygulanır (`cfg.form`); Friendly, eğitim ve online'da yok. **Hidrasyon** her maç türünde vardır (Friendly'de varsayılan sınırsız su ile).
7. **Göç sınırı:** eski ürünlerden gelen sayı çanta sınırını aşarsa **kaybolmaz**; sınırın üstünde kalır, sadece yenisi alınamaz.

## 13. Builder'a kalanlar
Anket sorularının tam metni ve puanları, kademe atlama animasyonu, çanta ikonları, HUD hidrasyon çubuğunun yeri, yeme kutusunda tür değiştirme, XP olaylarının tam eşikleri, fiyat tablosunun ürün ürün değerleri (§6.3 hedefleri içinde), dış mekân bilgisinin hangi `venue` alanından geldiği.
