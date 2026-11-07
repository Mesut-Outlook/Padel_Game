# agy-27 — Oyuncu duruşları: önizleme ve portre kartları

**Veren:** Claude Opus, 2026-11-07. **Plan:** `docs/superpowers/plans/2026-11-07-roster-stances.md`, Task 3 (oku). **Dal:** `roster-stances` (zaten açık; dal değiştirme, commit yapma, push yapma).

## Durum
- `data/characters.json`: 9 aktif oyuncunun her birinde `stance: { yaw, idle }` var. Lucía (`p27`), Tomás (`p34`) ve Elin (`p37`) için `{ yaw: 30, idle: 'relaxed' }`, diğer 6 oyuncu için `{ yaw: 0, idle: 'ready' }`. `yaw` derece cinsinden; pozitif değer oyuncuyu ekranın sağına çevirir.
- `src/roster.js`: `STANCE_CLIPS = { ready: 'Sword_Idle', relaxed: 'Idle_Loop', talk: 'Idle_Talking_Loop' }` (klipler `public/assets/anims/UAL1_Standard.glb` içinde).

## Yapılacaklar
1. **`src/player.js`:** `CLIPS` içine `STANCE_CLIPS`'teki klipler girsin. Avatara bir bekleme klibi seçtiren yol ekle: `createAvatar(..., opts)` ya da `avatar.playIdle(name)`. Yalnızca quaternion izleri kullanılacak (mevcut kural). Pozlarda `CLAUDE.md`'deki `posed`/`clipQ` kuralına uy. Maç içindeki davranış değişmeyecek: maçta hep `idle` (`Sword_Idle`) kalır.
2. **`src/menu.js`, önizleme (satır ~395–450):**
   - Kendi kendine dönme (`turntable += 0.006`) kalkacak, sürükleyerek döndürme (`turntable += dx * 0.015`) kalacak.
   - Oyuncu seçilince `turntable = ch.stance.yaw * Math.PI / 180` olacak ve `STANCE_CLIPS[ch.stance.idle]` oynayacak.
   - `setCustomPreview` (kariyer ve online önizleme) için `stance` yoksa `{ yaw: 0, idle: 'ready' }` kullan.
3. **`src/thumbs.js`, portre:**
   - Aynı `yaw` değerini `avatar.holder.rotation.y`'ye uygula; boyun düzeltmesinden önce yap.
   - Dönük duruşta yüz gövdeyi yarı yarıya izlesin: bakış hedefi `0.5 × yaw` kadar ekranın sağına kaysın. Düz duruşta bugünkü gibi kameraya baksın.
   - Portrenin bekleme klibi de duruşa uysun.
   - Önbellek anahtarı `stance.yaw` ve `stance.idle` değerlerini içersin. Bunun için `src/roster.js`'e `portraitKey(ch)` ekle, `thumbs.js` onu kullansın.
4. **Test:** `test/roster.test.js` dosyasının sonuna şunu ekle ve önce başarısız olduğunu gör:

```js
import { portraitKey } from '../src/roster.js';
test('a stance change makes a new portrait key', () => {
  const c = chars.find(x => x.id === 'p27');
  assert.notEqual(portraitKey(c), portraitKey({ ...c, stance: { ...c.stance, yaw: 0 } }));
});
```

5. **Ayar:**
   - `tools/posetest.html` ya da `npm run dev` ile Friendly ekranında 3 dönük oyuncuyu kontrol et. Dönük oldukları açıkça anlaşılmalı (20–40° arası), raket görünmeli, el gövdenin içine girmemeli.
   - İstersen bir oyuncuya `talk` beklemesi ver.
   - Son değerleri `data/characters.json`'a yaz. Kural değişmiyor: 6 oyuncu `yaw: 0`, 3 oyuncu `yaw > 0`.

## Kurallar
- Çalıştırabileceğin komutlar: `ls`, `cat`, `find`, `node`, `npm test`, `npx vite build`, `wc`, `sed`.
- `npm test` ve `npx vite build` geçmeli.
- Intel HD 620: yeni render geçişi yok, portreler 256×256 kalıyor.
- Yeni arayüz metni yok.
- `src/game.js`, `physics.js`, `rules.js` ve `ai.js` dosyalarına dokunma.

## Rapor
`agents/reports/agy-27-stances.md`:
- değişen dosyalar ve fonksiyon adları (Opus her birini grep ile kontrol edecek),
- son duruş değerleri,
- ne gördüğün. Ekran görüntüsü alabildiysen `agents/reports/agy-27-stances/` klasörüne koy. Alamadıysan bunu açıkça yaz; "görsel olarak doğrulandı" deme.
