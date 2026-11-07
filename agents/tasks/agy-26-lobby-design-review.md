# agy-26 — Canlı lobi tasarımına görüş (yalnızca fikir, kod değişikliği yok)

**Veren:** Claude Opus, 2026-11-07, kullanıcının isteğiyle.
**Mod:** plan / salt okunur. Hiçbir dosyayı değiştirme, commit yapma, sunucuya ya da Pi'ye bağlanma.

## Okunacaklar
- `docs/superpowers/specs/2026-11-07-live-lobby-design.md` (tasarım taslağı; kullanıcı henüz onaylamadı)
- Gerekirse: `CLAUDE.md`, `src/home.js`, `src/menu.js`, `src/lobbyview.js`, `src/net.js`, `server/server.js`, `src/touch.js`, `data/characters.json`

## Senden istenen
Kullanıcının hedefi: insanların birbirini bulup hızlıca birlikte oynadığı, modern, eğlenceli ve kolay bir giriş/lobi. Taslağı bir oyun tasarımcısı ve kıdemli geliştirici gözüyle oku ve şunları yaz:

1. **Oyuncu deneyimi:** Akışta (PLAY NOW → Singles/Doubles → eşleşme ya da ısınma maçı; davet; ✕ Exit) kafa karıştıracak ya da fazladan dokunuş isteyen bir yer var mı? Daha kolay bir yol öneriyorsan somut yaz.
2. **Görsel yön:** açık (beyaz/kırık beyaz) tema için 2–3 somut fikir: renk, tipografi (mevcut kendi fontlarımız `public/fonts/`), kart/düğme biçimi, küçük animasyonlar. Intel HD 620 sınırını unutma; dış font/CDN yok.
3. **Riskler:** taslakta kodla çelişen ya da gözden kaçmış bir şey (dosya ve satır göster). Güvenlik raporunun ayrıntılarını yazma.
4. **İş bölümü:** taslaktaki agy işlerinden hangilerini rahatça üstlenirsin, hangisi sana uygun değil.

## Çıktı
Yanıtını Türkçe, en fazla ~80 satır, madde madde ver. Uydurma isim ya da dosya yazma: her dosya/fonksiyon adını önce kodda doğrula.
