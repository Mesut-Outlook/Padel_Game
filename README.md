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

## Kontroller

| Tuş | Eylem | Gamepad |
|---|---|---|
| WASD / oklar | hareket | sol çubuk |
| Space / J | vuruş (duruma göre drive/vole/bandeja/smaç) | A |
| K | lob (globo) | B |
| L | smaç | Y |
| U | chiquita | X |
| I | víbora | RB |
| A/D (vururken) | topun yönü | sol çubuk |
| C | kamera: TV, oyuncu arkası, yan, tepe, top, drone, serbest | |
| R / Esc | son sayının tekrarı / tekrarı geç | |
| Enter (maç bitince) | ana menüye dön | |

Uzun ralli, smaç veya camdan dönen toptan sonra yavaş çekim tekrar otomatik açılır.

## Özellikler

- **Kurallar** (`src/rules.js`): FIP kortu, alttan çapraz servis, let, altın sayı / avantaj / Star Point (FIP 2026), tie-break (sonraki seti ilk karşılayan açar), süper tie-break, cam ve tel kuralları, servise vole yasağı.
- **Fizik** (`src/physics.js`): sürtünme, Magnus (topspin/slice), zemin/cam/tel ayrı sekme katsayıları, camda spin etkisi.
- **AI** (`src/ai.js`): 4 seviye (çaylak → efsane), çiftlerde birlikte fileye çıkma/çekilme, top tahmini, vuruş seçimi, boşluğa nişan.
- **Karakterler** (`src/player.js`): kadın/erkek gerçekçi gövde, 6 vücut tipi (ince, atletik, kaslı, iri, uzun, minyon), saç/ten rengi, shader ile padel kıyafeti, elde raket, solak/sağlak.
- **İçerik** (`data/`): 10 ülke/mekan, 16 karakter, 12 raket (yuvarlak/gözyaşı/elmas), turnuva formatları (Americano, Mexicano, King of the Court, lig, eleme) ve amatörden Premier Finals'a kariyer basamakları.

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
