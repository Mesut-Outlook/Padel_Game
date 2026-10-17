# Görev agy-08: Tüm Vücut Vuruş Animasyonları (prosedürel)

Sen Antigravity ajanısın; Claude Opus reviewer.

Kullanıcı talebi: "Gerçek tenis/padel vuruş animasyonları". CC0 tenis mocap bulunamadı (Quaternius UAL1/UAL2'de tenis yok, Mixamo CC0 değil), bu yüzden mevcut prosedürel poz sistemi (`src/player.js`, `P()` / `PREP` / `SWINGS` / `SERVE_SWING` / `track()`) **tüm vücuda** genişletilecek. Şu an sadece `spine_02`, kollar ve gövde `yaw`'ı oynuyor; bacaklar koşu/idle klibinde kalıyor, kalça-omuz ayrışması ve ağırlık aktarımı yok.

Kemikler (UE rig): `pelvis spine_01 spine_02 spine_03 neck_01 Head clavicle_l/r upperarm_l/r lowerarm_l/r hand_l/r thigh_l/r calf_l/r foot_l/r ball_l/r`.

## 1. Poz formatı (`src/player.js`)
- `P()` varsayılanlarına ekle (hepsi `[x,y,z]` Euler, idle klibinin üstüne `add()` ile çarpılır, kollar gibi `y,z` × `m` ile solaklara aynalanır):
  - `hips` → `pelvis` (kalça dönüşü; `yaw` tüm gövdeyi döndürmeye devam eder, `hips` omuzdan önce açılan kalçayı verir)
  - `chest` → `spine_03` (omuz dönüşü / üst gövde)
  - `rThigh`, `rCalf`, `rFoot` → raket tarafı bacak; `bThigh`, `bCalf`, `bFoot` → top eli tarafı bacak
  - `head` → `neck_01`
- `lerpPose()` yeni alanlarla otomatik çalışıyor (anahtar döngüsü), eski pozlar `P({...})` ile tanımlı olduğu için sıfır varsayılanla geriye uyumlu kalmalı.
- Diz bükülünce ayak kalkıyor sorunu zaten `root.position.y = restFoot - lowestFoot()` ile çözülüyor (pelvis otomatik alçalır) — bunu koru.

## 2. Hazırlık ve duruş
- `PREP.*`: dizler bükülü atletik duruş (thigh ≈ -0.35, calf ≈ +0.6 civarı; görsel olarak ayarla), forehand'de arka (raket tarafı) bacağa yük, backhand'de karşı bacağa, `overhead`'de yan duruş + arka bacağa yük (trophy).
- Alçak top (`ball[1] < 0.6`, satır ~434): sadece `spine` eğmek yerine ön dizi derin bük (lunge), gövde daha az eğilsin.
- Kafa: hazırlıkta ve vuruşta `head` topa baksın (top `ball` dünyada; oyuncunun yerel yönüne göre küçük yaw/pitch, ±0.6 rad sınır). Vuruştan sonra takip yönüne değil topa bakmaya devam edebilir.

## 3. Vuruşlar (`SWINGS`, `SERVE_SWING`)
Her vuruş: hazırlık → temas → takip, kinetik zincir sırası **bacak → kalça → omuz → kol**:
- `forehand` / `backhand`: arka bacaktan itiş, kalça (`hips`) temastan ~0.03–0.05 s önce açılır, `chest` onu izler; takipte arka topuk kalkar (`rFoot`/`bFoot` x rotasyonu), ağırlık öne geçer. Backhand tek el padel backhand'i (tenis iki el değil): top eli dengede geride.
- `volleyF` / `volleyB`: kısa, bloklayıcı; bacaklar bükülü, kalça az döner, öne küçük adım hissi.
- `overhead` (bandeja/víbora/rulo): yan duruş, kontrollü — smaç kadar sert değil, kalça az açılır, top eli hedefi gösterir.
- `smash` (smash/bajada): arka bacaktan güçlü itiş, kalça + göğüs tam açılır, takipte gövde öne ve aşağı katlanır, arka bacak öne savrulur. Zıplama yok (sim 2D) ama dizlerden açılma "yukarı uzanma" hissi versin.
- `SERVE_*`: alttan padel servisi — dizler bükülü, top bırakılırken çömelme, vuruşta ağırlık öne.
- Zamanlama tablosu `t` = temas anından saniye; `localSwingT` maksimumu 0.55, son anahtar `[0.55, P({})]` kalsın.

## 4. Koşu ile karışım
- Bacak ofsetleri koşu klibiyle çakışmasın: `cur === 'run'` iken bacak alanlarını ~0.35, `walk` iken ~0.6, idle'da 1 ağırlıkla uygula (sadece bacak alanları; üst gövde mevcut `steady` slerp mantığında kalsın).

## 5. Kısıtlar
- Sadece `src/player.js` (gerekirse geliştirici aracı `tools/posetest.html`). `game.js`, snapshot formatı, `physics/rules/ai` değişmez.
- agy-07 slow-mo düzeltmesini koru: `localSwingT`, `moved` kontrolü, `ballStepDt`, `idleQuats` slerp.
- Kare başına yeni nesne yok (mevcut `q`, `e` yeniden kullan; `lerpPose` mevcut haliyle kalabilir).
- Solak oyuncular (`m = -1`, `R/B` takası) doğru aynalanmalı; bacaklar da `R/B`'ye göre seçilmeli.
- Intel HD 620 hedefi: ek ışık/gölge yok.

## 6. Doğrulama
- İzinli komutlar: `ls cat find node "npm test" "npx vite build" wc sed grep head`.
- `npm test` 38/38, `npx vite build` hatasız.
- Görsel kontrol için `tools/posetest.html` (dev aracı, Vite ile `http://localhost:5173/tools/posetest.html`): bir sağlak + bir solak karakter yükle, vuruş seç, `t` kaydırıcısıyla hazırlık/temas/takip karelerini göster. Ekran görüntüsü alabiliyorsan `agents/reports/agy-08/` altına koy.
- **Commit/push yapma** — Opus inceleyip commit edecek.

Rapor: `agents/reports/agy-08-fullbody-strokes.md` (değişen dosyalar, her vuruş için anahtar kare tablosu, bilinen sorunlar).
