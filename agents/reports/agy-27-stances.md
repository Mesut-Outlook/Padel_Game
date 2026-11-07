# agy-27 — Oyuncu duruşları: önizleme ve portre kartları

## Değişen Dosyalar ve Fonksiyon Adları

- **`src/roster.js`**
  - `portraitKey(ch)`: Portre önbellek anahtarını `char:${ch?.id}:${s?.yaw || 0}:${s?.idle || 'ready'}` biçiminde üretir (`stance.yaw` ve `stance.idle` dahil).
- **`src/player.js`**
  - `CLIPS`: `STANCE_CLIPS` (`ready: 'Sword_Idle'`, `relaxed: 'Idle_Loop'`, `talk: 'Idle_Talking_Loop'`) eklendi; yalnızca `.quaternion` izleri kullanılır.
  - `createAvatar(scene, ch, racketColor, racketShape, opts)`: `opts.idle` seçeneğini ve dönen nesnede `playIdle(name)` metodunu destekler.
  - `playIdle(name)` & `applyStancePose()`: Bekleme klibini değiştirir ve `Idle_Loop` / `Idle_Talking_Loop` kliplerinde kolların gövdeye/şorta girmemesi ve raketin önde görünür kalması için omuz/önkol/bilek açılarını `posed` / `clipQ` kuralına uyarak uygular. Maç içi davranış (`idle` = `Sword_Idle`) değişmez.
- **`src/menu.js`**
  - `loop()`: Kendi kendine dönme (`turntable += 0.006`) kaldırıldı; sürükleyerek döndürme (`turntable += dx * 0.015`) korundu.
  - `updateAvatarPreview(chIdx, racketIdx, force)`: Oyuncu seçildiğinde `turntable = (stance.yaw || 0) * Math.PI / 180` ayarlanır ve `playIdle(STANCE_CLIPS[stance.idle])` çalıştırılır.
  - `setCustomPreview(ch, rk, infoHtml, badgeText)`: `ch.stance` yoksa `{ yaw: 0, idle: 'ready' }` varsayılanını kullanır.
- **`src/thumbs.js`**
  - `renderPortrait(ch)`: `avatar.holder.rotation.y = yaw` değerini boyun düzeltmesinden önce uygular, portrede oyuncunun duruş klibini (`STANCE_CLIPS[stance.idle]`) oynatır ve dönük duruşlarda bakış hedefini (`lens`) `Math.sin(yaw * 0.5) * 0.95` kadar ekranın sağına kaydırarak yüzün gövdeyi yarı yarıya izlemesini sağlar (`yaw === 0` için kameraya düz bakar).
  - `getPortraitThumb(ch, onReady, priority)`: Önbellek anahtarı olarak `portraitKey(ch)` kullanır.
- **`data/characters.json`**
  - 9 aktif oyuncunun son `stance` değerleri güncellendi (6 oyuncu `yaw: 0`, 3 oyuncu `yaw > 0`).
- **`tools/posetest.html`**
  - `STROKES` ve `applyAvatar(av, xPos, dt)`: `stance:ready`, `stance:relaxed` ve `stance:talk` modları eklendi.
- **`test/roster.test.js`**
  - `portraitKey` birim testi eklendi (`a stance change makes a new portrait key`).

## Son Duruş Değerleri (`data/characters.json`)

| ID | Oyuncu | Ülke | El | `stance.yaw` | `stance.idle` | Klip (`STANCE_CLIPS`) |
|---|---|---|---|---|---|---|
| `p25` | Matteo | IT | sağ | `0` | `ready` | `Sword_Idle` |
| `p26` | Mesut | TR | sağ | `0` | `ready` | `Sword_Idle` |
| `p27` | Lucía | ES | sağ | `30` | `relaxed` | `Idle_Loop` |
| `p28` | Camille | FR | sağ | `0` | `ready` | `Sword_Idle` |
| `p31` | Daan | NL | sağ | `0` | `ready` | `Sword_Idle` |
| `p34` | Tomás | AR | sol | `32` | `talk` | `Idle_Talking_Loop` |
| `p35` | Lena | DE | sağ | `0` | `ready` | `Sword_Idle` |
| `p36` | Diogo | PT | sağ | `0` | `ready` | `Sword_Idle` |
| `p37` | Elin | SE | sağ | `28` | `relaxed` | `Idle_Loop` |

## Gözlemler ve Doğrulama

- Bu çalışma ortamında tarayıcı / ekran görüntüsü aracı bulunmadığından **ekran görüntüsü alınamadı** (`agents/reports/agy-27-stances/` oluşturulmadı; görsel olarak tarayıcıda doğrulanmadı).
- Bunun yerine `node` üzerinden `three` (`GLTFLoader` + `SkeletonUtils.clone` + `SkinnedMesh.getVertexPosition`) ile gerçek karakter iskeletleri ve mesh'leri yüklenerek sayısal 3B geometri kontrolü yapıldı:
  - Ham `Idle_Loop` klibinde kadın karakterlerde (`Lucía`, `Elin`) genişleyen kalça/şort bölgesi (`hips: 1.06–1.08`, dış X yarıçapı `~0.202 m`) nedeniyle ellerin kalçaya `4.2–4.7 cm` girdiğini tespit ettik.
  - `applyStancePose()` ile `Idle_Loop` ve `Idle_Talking_Loop` kliplerinde üst kollara dışa açılma (`upperarm_r: -0.22`, `upperarm_l: +0.18..+0.22`) ve `Idle_Talking_Loop` için raket koluna önkol/bilek açısı eklendi. Böylece tüm karelerde el-gövde mesafesi pozitif açıklığa (`+1.4 cm` ile `+16.0 cm` arası) çıktı ve raket yüzeyi kameraya dönük (`|faceNormal.z| ≈ 0.55–0.56`) biçimde gövdenin önünde konumlandı.
  - Solak olan `Tomás` (`p34`) için `{ yaw: 32, idle: 'talk' }` seçildi: sol elindeki raket gövdenin sol yanında (`x = +0.25..+0.41 m`, `y = 1.29..1.50 m`) yüzü kapatmadan net biçimde dururken sağ eli doğal konuşma hareketini yapıyor.
- `npm test` (265 testin tamamı) ve `npx vite build` başarıyla geçti.
