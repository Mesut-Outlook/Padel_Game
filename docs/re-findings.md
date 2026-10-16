# Tersine mühendislik bulguları (rea)

**Hedef:** Red Bull Padel: Court Legends (Android, Premier Padel lisanslı). Yalnızca davranış: top fiziği, vuruş türleri, zamanlama, AI, kamera. Kod/model/doku/ses kopyalanmaz.

## Durum (2026-10-16)

- [x] rea 6.5.0 MCP + skill kuruldu: Claude Code ve Antigravity (`npx rea-agents setup --client claude_code --client antigravity --yes`). Yedekler: `~/.claude.json.rea.backup`, `~/.gemini/config/mcp_config.json.rea.backup`.
- [ ] APK analiz araçları kurulmadı: `sudo pacman -S android-tools jadx jdk-openjdk` (Unity IL2CPP çıkarsa ek olarak `ghidra`).
- [ ] APK alınmadı (kullanıcı şimdilik erteledi). Alma: telefonda USB hata ayıklama → `adb shell pm path com.redbull.padel` → `adb pull <yol>`.

## Şu an kullanılan değerler (FIP/gerçek padel, `src/physics.js`)

| Parametre | Değer | Kaynak |
|---|---|---|
| Kort | 10 × 20 m, file 0.88 m, servis çizgisi fileden 6.95 m | FIP |
| Arka duvar | 3 m cam + 1 m tel | FIP |
| Yan duvar | 2 m bölümler 3 m ve 2 m cam, kalan tel | FIP |
| Zemin sekme (dikey) | 0.74 | FIP top testi (2.54 m'den ~1.35–1.45 m sekme) |
| Cam | e 0.72 | tahmini, rea ile doğrulanacak |
| Tel | e 0.35 + rastgele sapma | tahmini |
| Hava direnci / Magnus | 0.0195 / 0.00045 | top aerodinamiği |

## rea ile doğrulanacaklar

1. Cam/tel restitution ve spin tutunması
2. Vuruş türleri ve zamanlama penceresi (perfect/early/late)
3. AI pozisyonlama ve zorluk parametreleri
4. Kamera ön ayarları ve tekrar tetikleyicileri

Araştırma özeti: `agents/reports/agy-01-research.md`.
