# Telefon desteği — kısa tasarım (2026-10-19)

**Amaç:** padellegends.eu telefonda (yatay) oynanabilsin; masaüstü davranışı değişmesin.

## Kararlar
- **Ne zaman:** `matchMedia('(pointer: coarse)')` (dokunmatik ekran) ya da test için `?touch`. `body.touch` sınıfı CSS'i açar.
- **Kontroller (`src/touch.js`):** sol yarıda başparmağın değdiği yerde beliren sanal çubuk (yarıçap 56 px = tam hız), sağ altta SHOT (büyük) + LOB + SMASH, sol üstte 🎥 kamera ve ⏸ pause. Çubuk `input.js` `setTouchMove()` ile klavye yönüne eklenir; düğmeler klavye olayı gönderir (Space / K / L / C / Escape). Böylece `{ move, swing, aim }` girdi şekli, kameraya göre hareket ve tekrar atlama aynen çalışır; aim = çubuğun yatay ekseni.
- **Gizlenenler (dokunmatik):** klavye yardım paneli, ⛶ düğmesi (tam ekran pause menüsünde), kamera rozetindeki ve vuruş ipucundaki tuş harfleri.
- **Dikey tutuş:** tam ekran "ROTATE YOUR PHONE" uyarısı (`#rotate`, `orientation: portrait`).
- **Küçük ekran (`max-height: 500px`):** sihirbaz ve kariyer üst/alt çubukları incelir, sol panel daralır; HOME'da üç kart yan yana, ikonsuz; maçta skor tablosu %78.
- Test: 844×390 iframe içinde `?touch` (masaüstü Chrome); gerçek telefonda denenmedi.

## Kapsam dışı (sonra)
Chiquita / víbora / contrapared düğmeleri (otomatik vuruş bunları seçebiliyor), dokunmatik titreşim, kariyer ekranlarının ayrıntılı telefon düzeni.
