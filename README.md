# Padel Legends

Tarayıcıda çalışan 3D padel oyunu (Three.js). 1–4 oyuncu, boş koltuklara AI, arkadaşlarla online.

## Hızlı başlangıç

```bash
npm install
npm run dev        # http://localhost:5173 — tek başına / AI'ya karşı / aynı PC'de gamepad ile
npm run online     # build + oyun ve WebSocket sunucusu tek portta: http://localhost:8080
npm test           # kurallar, fizik, AI, replay testleri
```

İnternetten arkadaşlarla: `npm run online` sonra `cloudflared tunnel --url http://localhost:8080`, çıkan linki paylaş. Herkes aynı **oda kodunu** girer, ev sahibi "MAÇA BAŞLA"ya basar. Boş koltuklar ve maç ortasında ayrılan oyuncular AI'ya geçer.

## Tarayıcıda oyna (GitHub Pages)

**https://padellegends.eu** — resmi adres; kurulum gerekmez, linki paylaşmak yeterli. `http://`, `www.` ve eski `mesut-outlook.github.io/Padel_Game/` adresi 301 ile buraya yönlenir. HTTPS zorunlu (Let's Encrypt, GitHub kendisi yeniler).

`main` dalına her yüklemede `.github/workflows/pages.yml` testleri çalıştırır, oyunu derler ve GitHub Pages'te yayınlar
(Mesut-Outlook/Padel_Game → Settings → Pages: Source **GitHub Actions**, Custom domain **padellegends.eu**).
Alan adı Namecheap'te (yalnız alan adı, hosting yok; BasicDNS: 4× A `@` → 185.199.108–111.153, CNAME `www` → `mesut-outlook.github.io`).
Alan adı Mesut-Outlook hesabında **Verified domain**; Namecheap'teki TXT kaydı `_github-pages-challenge-mesut-outlook` **silinmemeli**.
Actions ile yayınlandığı için depoda CNAME dosyası gerekmez; vite `base: './'` alan adı kökünde de çalışır.

Pages sürümünde bilgisayara karşı maç, eğitim, menü ve kol desteği çalışır; **online mod** bir oyun sunucusu
(`npm run server`) ister — adrese `?server=wss://sunucu-adresi` eklenerek kendi sunucuna bağlanabilir.
Kalıcı online sunucu henüz yok: plan ayrı bir sunucu (VPS / Fly.io vb.) + `server.padellegends.eu` alt alan adı
(Namecheap paylaşımlı hosting WebSocket sunucusu için uygun değil).

## Ziyaret sayacı (GoatCounter)

https://padellegends.goatcounter.com — çerezsiz, kişisel veri yok (AB'de onay penceresi gerekmez); localhost sayılmaz.
Sayfa ziyaretlerine ek olarak oyun olayları (`src/track.js`, panelde `event` satırları). Yalnız sabit adlar ve enum değerler; isim, oda kodu, görünüm, serbest metin **gönderilmez** (`?room=` davet kodu sayaç yüklenmeden adresten çıkarılır):

| Olay | Ne zaman |
|---|---|
| `match-start/<singles\|doubles>/<rookie\|club\|pro\|legend>/<mekan id>` | offline maç başladı (kariyer dahil) |
| `match-end/<win\|loss\|watch>` · `match-quit` | maç bitti · bitmeden ana menüye dönüldü |
| `tutorial-start` · `tutorial-end` | eğitim başladı · eğitimden çıkıldı |
| `career-open` · `career-create` | kariyer açıldı · karakter yaratıldı |
| `career-tournament/<turnuva id>` · `career-shop-buy/<racket\|shoes\|ball\|kit\|headwear>` · `career-training/<özellik>` | turnuvaya girildi · marketten alındı · antrenman |
| `online-click` · `online-create` · `online-join` | Online'a basıldı (menü veya kariyer) · oda kuruldu · koda katılındı |
| `input/<keyboard\|xbox\|playstation\|touch\|other>` | oturumda ilk kullanılan giriş aygıtı (her biri bir kez) |
| `settings-change/<control\|speed>` | hangi ayar değişti (değeri değil) |
| `fullscreen-on` | tam ekrana geçildi |

## Kontroller

| Tuş | Eylem | Gamepad (Xbox) |
|---|---|---|
| WASD / oklar | hareket | sol çubuk |
| Space / J | vuruş (duruma göre drive/vole/bandeja/smaç) | A |
| K | lob (globo) | B |
| L | smaç | Y |
| U | chiquita | X |
| I | víbora | RB |
| F | slice servis | LB |
| O | contrapared: kendi camına vur, sekip karşıya geçsin (A/D basılı = sol/sağ yan cam, boş = arka cam) | RT |
| WASD (servis öncesi) | servis yerini kaydır (kendi yarısında, servis çizgisinin gerisinde) | sol çubuk |
| A/D (vururken) | topun yönü | sol çubuk |
| C | kamera: TV, oyuncu arkası, yan, tepe, top, drone, serbest | View (Back) |
| R / Esc | son sayının tekrarı / tekrarı geç | R3 / B |
| M | sesi aç/kapa | |
| Enter (maç bitince) | ana menüye (kariyer maçında kariyer ekranına) dön | Start |

**PlayStation kolu** (DualShock 4 / DualSense) da desteklenir: tuşlar aynı yerde, ekranda PlayStation simgeleri çıkar (A=✕, B=○, X=□, Y=△, LB/RB=L1/R1, LT/RT=L2/R2, View=Share, Start=Options).

**Enerji:** koşmak ve vuruşlar oyuncuyu yorar; uzun rallilerde ve düşük dayanıklılıkta (stamina) daha çabuk. Yorgun oyuncu daha yavaş koşar, daha çok hata yapar. Sayı aralarında biraz, taraf değişiminde su + muz molasıyla çok toparlanır. Skor tablosunun altında enerji çubuğu var.

Menüdeki **Kontrol** seçimi 1. oyuncu için: *Klavye + Xbox kolu* (ikisi birden), *Sadece klavye* veya *Sadece Xbox kolu*. Diğer insan oyuncular kalan kolları sırayla alır.

**Servis:** yan duruş, raket başın arkasında, top öndeki elde → top bırakılır, yere seker ve bel altında alttan vurulur (FIP kuralı).
Menüdeki **Oyun hızı** (Yavaş / Normal / Hızlı) temel tempodur; üstüne AI seviyesi eklenir (Çaylak daha yavaş, Efsane daha hızlı) ve maç ilerledikçe tempo her oyunda biraz artar (en çok %12). Çaylak/Kulüp/Profesyonel seviyede, yön vermediğin anlarda oyuncun AI'nın duracağı yere doğru kendiliğinden yanaşır (yardım Efsane'de kapalı); vuruşları hep sen seçersin. Online maçlar sunucu hızında oynanır.

Uzun ralli, smaç veya camdan dönen toptan sonra yavaş çekim tekrar otomatik açılır.

## Eğitim

Menüde **🎓 EĞİTİM**: 14 derslik seri, gerçek oyun fiziği ve kurallarıyla (top makinesi topları sana atar, vuruşun gerçekten karşı sahaya düşerse sayılır). Talimatlar son kullandığın cihaza göre klavye ya da Xbox kolu tuşlarını gösterir; ilerleme tarayıcıda saklanır, Enter / Start dersi atlar.

Hareket · Servis · Slice servis · Forehand · Backhand · Yön verme · Lob · Chiquita · Vole · Smaç · Camdan oyun · Contrapared · Kamera ve tekrar · Mini maç (Çaylak AI'a karşı 3 sayı).

Kolun tarayıcıda nasıl göründüğünü test etmek için: http://localhost:5173/tools/padtest.html

## Özellikler

- **Giriş ekranı** (`src/menu.js`, `src/thumbs.js`): 5 sekmeli görsel menü (Mod · Oyuncu · Mekan · Raket · Maç). Karakter portreleri, mekan ve raket görselleri oyunun kendi 3D modellerinden üretilir. Solda seçili oyuncunun dönen 3D önizlemesi var. Fare, klavye ve Xbox koluyla gezilir (LB/RB sekme, A seç, B geri, Start başla).

- **Kurallar** (`src/rules.js`): FIP kortu, alttan çapraz servis, let, altın sayı / avantaj / Star Point (FIP 2026), tie-break (sonraki seti ilk karşılayan açar), süper tie-break, cam ve tel kuralları, servise vole yasağı.
- **Fizik** (`src/physics.js`, `src/court.js`): sürtünme, Magnus (topspin/slice), zemin/cam/tel ayrı sekme katsayıları, camda spin etkisi, filenin iki yanında FIP standartlarında 1 metrelik yan kapılar (`z: 0.08–1.08m, h: 2.2m`) ve beyaz koruyucu dolgu süngerleri (`door padding`). Sekmeden sonra kapıdan çıkan top vurana sayı, sekmeden önce çıkan top dışarı (`out`).
- **Vuruş pozları** (`src/player.js`): top yaklaşırken forehand / backhand / üstten (smaç, bandeja) hazırlığı, alçak topta eğilme; her vuruş hazırlık → temas → takip. Smaç yavaş çekiminde fizik adımı senkronizasyonu ile raket hazırlık kilitlenmesi (jitter çözümü), `idleQuats` üst gövde sabitlemesi ve doğal trophy pose açıları.
- **Vuruş koçu** (`src/main.js`): sana servis çizgisinin içinde üstten vurulabilecek bir top gelirse oyun yavaşlar, kamera oyuncunun arkasından topa bakar ve altta tuş önerisi çıkar (SMAÇ L · VÍBORA I · BANDEJA Space; kolda Y / RB / A). Gerideki yüksek toplarda, camdan dönen toplarda (bajada) ve rakipler fileyken (lob) yalnızca öneri gösterilir.
- **His & Ses Dünyası** (`src/audio.js`, `src/main.js`): smaçta vurucunun arkasından alçak açı + yavaş çekim, dinamik odak efekti (`#smashVignette`) ve ekran pankartı (`#smashBanner`: hız `KM/H`, `PERFECT TIMING`, `SUPER SMASH!`), zaman bükülmesi bas düşüşü + D-Dorian fanfar melodisi (`sfxSmashSlowMo` & `sfxSmashImpact`); ralli içi seyirci tepkileri (smaç ve camda `'ooh'`, uzun rallide alkış ve ıslık `'cheer'`, servis hatasında mırıltı `'murmur'`); 116 BPM prosedürel WebAudio "Padel Tour" synth arka plan müziği; hızlı topta hız izi ve yanından geçerken "vuuş" sesi; dosyasız WebAudio vuruş sesleri, vuruşta kısa duraklama, smaçta kamera sarsıntısı, oyuncuların İngilizce kısa sözleri (konuşma balonu + tarayıcı sesi). `M` tuşu tüm ses ve müziği açıp kapatır.
- **Arayüz & Dil Desteği** (Tam İngilizce): Menüler (`src/menu.js`), oyun içi HUD (`SET`, `PTS`, `GOLDEN POINT`, `ADVANTAGE`), duraklatma menüsü (`Resume`, `Restart match`, `Main menu` — DOM churn korumalı), klavye / Xbox kol yardımı (`src/helpkeys.js`: son kullanılan cihaza göre klavye ya da kol çizimi, basılan tuş yanar; `H` veya D-pad ↑ aç/kapa), 14 derslik eğitim (`src/tutorial.js`), kontroller sayfası (`public/kontroller.html`), gamepad test aracı (`tools/padtest.html`) ve ağ mesajları tamamen İngilizce olarak sunulur.
- **AI** (`src/ai.js`): 4 seviye (çaylak → efsane), çiftlerde birlikte fileye çıkma/çekilme, top tahmini, vuruş seçimi, boşluğa nişan.
- **Karakterler** (`src/player.js`): kadın/erkek ince-atletik tenisçi gövdesi, 6 vücut tipi (ince, atletik, kaslı, iri, uzun, minyon), ten rengi, her karaktere özel görünüm (`data/characters.json`): saç (uzun, küt, topuz, at kuyruğu, kısa, seyrek, kel, samuray topuzu) ve rengi, jöleli parlak saç, sakal (tam / hafif / keçi) ve rengi, gözlük, makyaj, yüz genişliği, omuz genişliği, saç bandı / vizör, gerçek forma ve şort (vücutla hareket eden, yuvarlak yakalı, şeritli kumaş modelleri; kumaş vücut hatlarını göstermez), padel ayakkabısı, elde raket (yüzü önde, sap avuçta), solak/sağlak.
- **Kariyer modu** (`src/career.js`, `src/tournament.js`, `src/careerui.js`; menüde **CAREER**): 26 şablondan karakter yarat, görünümü (saç modeli ve rengi, sakal ve rengi, ten, vücut, yüz, gözlük, makyaj, saç bandı/vizör) istediğin an ücretsiz değiştir. Her özellik 4'ten başlar; kariyer maçlarında **Credits** kazan (oynadın + kazanılan oyun/sayı + galibiyet + her 10 STYLE puanı 1 Credit, AI seviyesi çarpanı), **Training**'de 6 özelliği (hız, güç, kontrol, vole, smaç, dayanıklılık) geliştir, **Shop**'ta raket (çekirdek/yüzey/şekil), ayakkabı (hız, çeviklik), top (Standard/Pro/Pro S: hız ve sekme), forma takımı ve başlık al; **Locker**'da kuşan. **Tournaments**: Club Americano'dan Premier Padel Finals'a 10 basamaklı merdiven (Americano, Mexicano, eleme, lig; ralli puanlaması 16 sayıya), giriş ücreti, dereceye göre Credits + sıralama puanı, yarıda bırakılan turnuva kaldığı turdan devam; **Ranking**: dünya sıralaması. **Play Online**: sunucudaki açık odaları listele, oda kur / katıl; karakterinin görünümü diğer oyunculara gider, online maç ×1.2 öder. İlerleme yalnız bu tarayıcıda saklanır (Profile → Export / Import ile yedekle). Denge değerleri `data/economy.json`, `data/shop.json`, `data/tournaments.json`.
- **Yerel 2 oyuncu**: çiftlerde 2 insan oyuncu *Opponents* (karşılıklı) ya da *Same team* (aynı takımda, 2 AI'ya karşı) oynayabilir.
- **Mekan atmosferi** (`src/skyline.js`, `src/fx.js`): her şehrin simgeleri kortun etrafında katmanlı silüet olarak çizilir (İstanbul camileri, minareler, Galata, Boğaz köprüsü; Roma Kolezyum; Madrid kuleleri; Doha kuleleri; Rotterdam Erasmus köprüsü; Acapulco kayalıkları…), gün batımında güneş, gecede ışıklı pencereler, kapalı salonlarda cam cephe + tavan. Top cama çarpınca halka dalgası, tele çarpınca titreşen tel deseni; sekmeden doğrudan duvara giden topta kırmızı çatlak, daha sert ses ve kamera sarsıntısı.
- **İçerik** (`data/`): 10 ülke/mekan, 26 karakter, 12 raket (yuvarlak/gözyaşı/elmas), turnuva formatları (Americano, Mexicano, King of the Court, lig, eleme) ve amatörden Premier Finals'a kariyer basamakları.

Geliştirici ve ana sponsor: **Mesut** (kort reklamları, file bandı, menü, skor tabelası).

## Yapı

```
src/      game.js (paylaşılan simülasyon, enerji), physics.js, rules.js, ai.js, player.js, court.js, skyline.js,
          fx.js, padnav.js (kol ile menü gezintisi), padstyle.js (Xbox / PlayStation etiketleri), thumbs.js,
          camera.js, replay.js, input.js, net.js, main.js, audio.js, helpkeys.js, tutorial.js,
          career.js (profil, ekonomi, market, merdiven), tournament.js (turnuva motoru), careerui.js (kariyer ekranları)
server/   server.js — otoriter oda sunucusu + dist/ statik servis
data/     rackets, venues, tournaments, characters, economy, shop (JSON)
public/assets/  ubc/ karakter modelleri, anims/ animasyonlar
agents/   Antigravity görev (tasks/) ve raporları (reports/)
docs/     re-findings.md (rea tersine mühendislik notları)
```

## Yol haritası

- [x] Faz 1 — oynanabilir maç, kameralar, tekrar
- [x] Faz 2 — online odalar
- [x] Gerçekçi karakterler + raket
- [x] FIP kort kapıları ve beyaz koruma çerçevesi (`agy-05`)
- [x] Duraklatma menüsü tıklama ve yeniden başlatma stabilizasyonu (`agy-06`)
- [x] Smaç slow-mo jitter çözümü, efekt yazısı & melodisi, seyirci tepkileri, oyun müziği ve tam İngilizce UI (`agy-07`)
- [x] Maç içi STYLE puanı, seri çarpanı, madalyalar, seyirci coşkusu (`agy-09`)
- [x] Faz 3a — kariyer modu (tasarım: `docs/superpowers/specs/2026-10-17-career-mode-design.md`, plan: `docs/superpowers/plans/2026-10-17-career-mode.md`): profil + karakter yaratıcı, Credits/sıralama puanı, antrenman, market ve dolap, ayakkabı/top etkileri, ralli puanlaması, Americano/Mexicano/eleme/lig turnuvaları, merdiven ve dünya sıralaması, online açık oda listesi (`agy-10`, `agy-11`; `agy-12`/`agy-13` agy kotası dolunca Sonnet alt-ajanıyla)
- [x] Yerel 2 oyuncu: aynı takım / rakip seçimi
- [x] Kol ile menü gezintisi düzeltildi (D-pad + çubuk ölü bölgesi, ekrandaki konuma göre odak; Training / Start Match erişilebilir)
- [x] Cam/tel çarpma efektleri ve sesleri; sekmeden doğrudan duvara giden topa kırmızı çatlak + sarsıntı
- [x] Şehre özel mekan silüetleri (10 şehir), kapalı salonlarda cam cephe
- [x] Oyuncu portreleri kameraya bakıyor ve ortalı
- [x] Oyuncu enerjisi / yorgunluk ve taraf değişiminde su molası
- [x] PlayStation kolu (DualShock 4 / DualSense) etiketleri
- [ ] Kariyer marketinde enerji ürünleri (muz, izotonik, jel) — karar verildi, tasarım: `docs/superpowers/specs/2026-10-18-home-modes-energy-design.md`
- [ ] Telefon desteği: maçta dokunmatik kontroller (sol sanal çubuk, sağda vuruş düğmeleri), dikte "telefonu çevir" uyarısı, menülerin dokunmaya ve küçük ekrana uygun hale gelmesi — planlandı (2026-10-19 gece, enerji ürünlerinden sonra)
- [ ] Enerji değerlerinin oynayarak ince ayarı (`ENERGY` tablosu, `src/game.js`)
- [x] Forma çeşitleri: polo, V yaka, kolsuz, desenli (bazı karakterlerde ve markette) — `agy-14`
- [x] Açılış animasyonu + ana ekran (Friendly Match / Career / Friends Cup), Friendly'de Where? (bu bilgisayar / online, oda linki `?room=`), ortak Settings (kariyer maçları da okur), `#home` / `#friendly` / `#career` rotaları — `agy-15`
- [x] Tam ekran: ⛶ düğmesi (ana ekran, menü, maç), duraklatma menüsü, menülerde F (maçta F = slice) — `agy-16`
- [ ] Karar bekliyor: Friends Cup sunucusunun barındırılması — alan adı (domain) ile birlikte kararlaştırılacak
- [ ] Kariyer küçük işleri (son incelemeden): partner/sıralamada şablon karakterin AI kopyası; ödül kartı boşluğu; online odada formların gizlenmesi ve başarısız katılımda ekranın takılı kalması; uzak oyuncunun raket rengi; tek başına online (özel oda + AI) ×1.2 ödüyor; ralli puanlamasında skor tablosu `repeat(0, …)` kontrolü; lobi/profil metinlerinin `innerHTML` yerine metin olarak basılması; kariyer maçları menüdeki Kontrol/Oyun hızı ayarını kullanmıyor; markette hata metninde ham neden kodu; 16 çiftlik turnuvada aynı AI iki tarafta; turnuva maçından yarıda çıkınca maç tekrar oynanabiliyor (hükmen yenilgi yok)
- [ ] Faz 3b — giriş/hesap, rezervasyon, online turnuvalar, ücretli kestirmeler
- [ ] (Beklemede) rea ile Red Bull Padel APK davranış analizi → fizik/his ayarı (`docs/re-findings.md`); APK yok — değeri ve güvenli kaynağı (kendi Android cihazından Google Play) sonra konuşulacak
- [x] Tüm vücut prosedürel vuruşlar: bacak itişi, kalça-omuz ayrışması, alçak topta lunge, topu izleyen kafa (`agy-08`)
- [ ] Vuruş pozlarında ince ayar (temasta dizler hafif içe kapanıyor; `tools/posetest.html` ile)

## Lisanslar

Kod: proje sahibine ait. Karakterler ve animasyonlar: [Quaternius](https://quaternius.com) Universal Base Characters ve Universal Animation Library, **CC0 1.0** (`public/assets/*/LICENSE-Quaternius-CC0.txt`). Ticari oyunlardan kod/asset kopyalanmamıştır; rea yalnızca davranış analizi için kullanılır.
