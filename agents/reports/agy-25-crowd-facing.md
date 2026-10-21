# Görev agy-25 Raporu: Seyircilerin Sahaya ve Oyunculara Bakacak Şekilde Yönlendirilmesi

Sen Antigravity ajanısın; Claude Opus reviewer. Commit ve push yapma — yalnızca Opus commit eder.

---

## 1. Sorun ve İnceleme

Kullanıcının ilettiği referans ekran görüntüsünde (kullanıcının ekran görüntüsü (yerel)) görüldüğü üzere:
- Tribündeki seyirciler sahaya ve kort içine bakmak yerine, sahanın dip çizgisi / kamera yönüne (Z ekseni boyunca) dik olarak dönük duruyordu.
- **Kök Neden 1 (`src/court.js`)**: `setupImpostorMesh` ve `updateCrowd` fonksiyonlarında `crowdMesh` için `q.identity()` kullanılıyordu. `PlaneGeometry` yüzey normali `(0, 0, 1)` (+Z) olduğu için kimlik kuaterniyonu seyircileri kortun uzun kenarı eksenine baktırıyordu.
- **Kök Neden 2 (`src/crowdatlas.js`)**: Özel `createCrowdMaterial` vertex shader'ında `#include <project_vertex>` silindirik billboarding (`right = vec3(toCam.z, 0.0, -toCam.x)`) ile eziliyordu. Bu durum `instanceMatrix` rotasyonunu tamamen geçersiz kılarak quad'ları kameraya bakmaya zorluyor ve seyircilerin koltuklarında korta dönük oturmasını engelliyordu. Ayrıca atlas renderında uygulanan `-0.80 rad` bodyYaw telafi hack'i kaldırıldı.

---

## 2. Yapılan Değişiklikler

### `src/court.js`
1. **`baseSpec` Hesabı**:
   - Her seyircinin tribün tarafı (`occ.seat.side`: +1 sağ tribün, -1 sol tribün) ve konumu kaydedildi.
   - Seyircilerin sahaya dönük olması için temel açı `-side * Math.PI / 2` olarak belirlendi.
   - Dip çizgilerden kort merkezine ve fileye (`z = 0`) doğru doğal bir bakış açısı sağlamak için merkeze yönelim açısı eklendi:
     ```javascript
     const centerAngle = Math.atan2(pz, Math.abs(px)) * 0.18;
     const yaw = -side * Math.PI / 2 - side * centerAngle + (Math.random() - 0.5) * 0.10;
     ```
2. **`setupImpostorMesh`**:
   - `crowdMesh` oluşturulurken `q.identity()` yerine `q.setFromAxisAngle(yAxis, b.yaw)` uygulandı.
3. **`updateCrowd` (Idle ve Tezahürat/Zıplama Döngüsü)**:
   - Hem coşku sona erdiğinde (sıfırlama anında) hem de zıplama/tezahürat sırasında `q.setFromAxisAngle(yAxis, b.yaw)` kuaterniyonu korundu; yön kaybı engellendi.
4. **`placeholderMeshes`**:
   - Atlas yüklenene kadar gösterilen geçici modellerde de `b.yaw` kullanılarak tam görsel tutarlılık sağlandı.

### `src/crowdatlas.js`
1. **`createCrowdMaterial`**:
   - `project_vertex` üzerindeki kamera-takip silindirik billboarding override'ı kaldırıldı. Three.js'in standart instanced rendering boru hattı aktif edilerek `instanceMatrix` rotasyonunun (`b.yaw`) doğrudan quad'lara uygulanması sağlandı.
   - UV mapping doğrudan `uv.x` olarak sadeleştirildi (artık 3D uzayda kuaterniyon ile yönlendirildiği için 2D texture çevirme hack'ine gerek kalmadı).
   - `customProgramCacheKey` değeri `'crowd_impostor_billboard_v2'` olarak güncellendi.
2. **Atlas Render Pozları**:
   - Oturan ve sevinen karakterlerin offscreen atlas renderında `bodyYaw = 0` (koltuğunda dik/düz oturan) yapıldı; baş eğimi kort zeminine ve oyunculara bakacak şekilde (`gazePitch ≈ 0.12 rad`) hafifçe aşağı eğildi.

### `test/crowdfacing.test.js`
- Her iki yan tribündeki seyircilerin yüzey normallerinin korta (`side = +1` için `-X`, `side = -1` için `+X`) ve fileye/merkeze (`z > 0` için `-Z`, `z < 0` için `+Z`) baktığını doğrulayan birim testi eklendi.

---

## 3. Matematiksel Doğrulama

Normal vektörü `(0, 0, 1)` dönüşüm sonuçları:

| Tribün | Z Konumu | Normal Vektörü $(X, Y, Z)$ | Yön Açıklaması |
|---|---|---|---|
| **Sağ Tribün (`side = +1`)** | $pz = +8$ (yakın dip) | $(-0.989, 0.000, -0.147)$ | Korta (-X) ve fileye (-Z) bakıyor |
| **Sağ Tribün (`side = +1`)** | $pz = 0$ (file hizası) | $(-1.000, 0.000, 0.000)$ | Doğrudan korta (-X) dik bakıyor |
| **Sağ Tribün (`side = +1`)** | $pz = -8$ (uzak dip) | $(-0.989, 0.000, +0.147)$ | Korta (-X) ve fileye (+Z) bakıyor |
| **Sol Tribün (`side = -1`)** | $pz = +8$ (yakın dip) | $(+0.989, 0.000, -0.147)$ | Korta (+X) ve fileye (-Z) bakıyor |
| **Sol Tribün (`side = -1`)** | $pz = 0$ (file hizası) | $(+1.000, 0.000, 0.000)$ | Doğrudan korta (+X) dik bakıyor |
| **Sol Tribün (`side = -1`)** | $pz = -8$ (uzak dip) | $(+0.989, 0.000, +0.147)$ | Korta (+X) ve fileye (+Z) bakıyor |

Her iki tribündeki seyirciler simetrik olarak korta ve sahadaki maça odaklanmaktadır.

---

## 4. Test Sonuçları

### `npm test`
```
✔ crowd facing: spectators on both side stands face inward towards the court with center tilt (7.62ms)
ℹ tests 232
ℹ suites 0
ℹ pass 232
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 7238.468377
```

### `npx vite build`
```
✓ 78 modules transformed.
dist/index.html                                  97.55 kB │ gzip:  19.32 kB
dist/assets/main-BUGuG54H.js                    985.01 kB │ gzip: 277.52 kB
✓ built in 10.71s
```

---

## 5. Değiştirilen Dosyalar

1. `src/court.js`: Seyirci yönlendirmesi (`b.yaw`), `setupImpostorMesh` ve `updateCrowd` rotasyon koruması.
2. `src/crowdatlas.js`: `createCrowdMaterial` vertex shader'ının `instanceMatrix` rotasyonunu kabul etmesi, atlas renderında `bodyYaw = 0` düzeltmesi.
3. `test/crowdfacing.test.js`: Seyirci yönelim açısı ve normal vektör testi.
4. `AGENTS.md`: `agy-25` durumu güncellendi.
