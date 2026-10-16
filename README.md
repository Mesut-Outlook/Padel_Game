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

`main` dalına her yüklemede `.github/workflows/pages.yml` testleri çalıştırır, oyunu derler ve GitHub Pages'te yayınlar:
**https://mesut-outlook.github.io/Padel_Game/** — kurulum gerekmez, linki paylaşmak yeterli.

İlk kez açmak için depoda **Settings → Pages → Build and deployment → Source: GitHub Actions** seçilmeli.
Pages sürümünde bilgisayara karşı maç, eğitim, menü ve kol desteği çalışır; **online mod** bir oyun sunucusu
(`npm run server`) ister — adrese `?server=wss://sunucu-adresi` eklenerek kendi sunucuna bağlanabilir.

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
| Enter (maç bitince) | ana menüye dön | Start |

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
- **Fizik** (`src/physics.js`): sürtünme, Magnus (topspin/slice), zemin/cam/tel ayrı sekme katsayıları, camda spin etkisi, filenin iki yanında yan kapılar (sekmeden sonra kapıdan çıkan top vurana sayı).
- **Vuruş pozları** (`src/player.js`): top yaklaşırken forehand / backhand / üstten (smaç, bandeja) hazırlığı, alçak topta eğilme; her vuruş hazırlık → temas → takip.
- **Vuruş koçu** (`src/main.js`): sana servis çizgisinin içinde üstten vurulabilecek bir top gelirse oyun yavaşlar, kamera oyuncunun arkasından topa bakar ve altta tuş önerisi çıkar (SMAÇ L · VÍBORA I · BANDEJA Space; kolda Y / RB / A). Gerideki yüksek toplarda, camdan dönen toplarda (bajada) ve rakipler fileyken (lob) yalnızca öneri gösterilir.
- **His** (`src/audio.js`, `src/main.js`): smaçta vurucunun arkasından alçak açı + yavaş çekim, hızlı topta hız izi ve yanından geçerken "vuuş" sesi; dosyasız WebAudio sesleri (raket, zemin, cam, tel, file, alkış), vuruşta kısa duraklama, smaçta kamera sarsıntısı, oyuncuların kısa sözleri (konuşma balonu + tarayıcı sesi).
- **AI** (`src/ai.js`): 4 seviye (çaylak → efsane), çiftlerde birlikte fileye çıkma/çekilme, top tahmini, vuruş seçimi, boşluğa nişan.
- **Karakterler** (`src/player.js`): kadın/erkek ince-atletik tenisçi gövdesi, 6 vücut tipi (ince, atletik, kaslı, iri, uzun, minyon), ten rengi, her karaktere özel görünüm (`data/characters.json`): saç (uzun, küt, topuz, at kuyruğu, kısa, seyrek, kel, samuray topuzu) ve rengi, sakal (tam / hafif / keçi) ve rengi, gözlük, makyaj, yüz genişliği, omuz genişliği, saç bandı / vizör, gerçek forma ve şort (vücutla hareket eden, yuvarlak yakalı, şeritli kumaş modelleri; kumaş vücut hatlarını göstermez), padel ayakkabısı, elde raket (yüzü önde, sap avuçta), solak/sağlak.
- **İçerik** (`data/`): 10 ülke/mekan, 26 karakter, 12 raket (yuvarlak/gözyaşı/elmas), turnuva formatları (Americano, Mexicano, King of the Court, lig, eleme) ve amatörden Premier Finals'a kariyer basamakları.

Geliştirici ve ana sponsor: **Mesut** (kort reklamları, file bandı, menü, skor tabelası).

## Yapı

```
src/      game.js (paylaşılan simülasyon), physics.js, rules.js, ai.js, player.js, court.js,
          camera.js, replay.js, input.js, net.js, main.js
server/   server.js — otoriter oda sunucusu + dist/ statik servis
data/     rackets, venues, tournaments, characters (JSON)
public/assets/  ubc/ karakter modelleri, anims/ animasyonlar
agents/   Antigravity görev ve raporları
docs/     re-findings.md (rea tersine mühendislik notları)
```

## Yol haritası

- [x] Faz 1 — oynanabilir maç, kameralar, tekrar
- [x] Faz 2 — online odalar
- [x] Gerçekçi karakterler + raket
- [ ] Faz 3 — kariyer (puan + para), raket/ayakkabı mağazası, turnuva akışı
- [ ] rea ile Red Bull Padel APK davranış analizi → fizik ayarı (`docs/re-findings.md`)
- [ ] Gerçek tenis/padel vuruş animasyonları (şu an kılıç vuruşu klibi + prosedürel vurgular)

## Lisanslar

Kod: proje sahibine ait. Karakterler ve animasyonlar: [Quaternius](https://quaternius.com) Universal Base Characters ve Universal Animation Library, **CC0 1.0** (`public/assets/*/LICENSE-Quaternius-CC0.txt`). Ticari oyunlardan kod/asset kopyalanmamıştır; rea yalnızca davranış analizi için kullanılır.
