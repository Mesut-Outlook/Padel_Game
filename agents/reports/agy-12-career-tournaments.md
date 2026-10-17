# agy-12 Rapor: Turnuva ve Sıralama ekranları (Claude Sonnet tarafından yazıldı)

## Değişen dosyalar
- `src/careerui.js` (yeni ekranlar + hub/navigasyon değişiklikleri)
- `index.html` (`.cr-tour-*` stilleri)
- Dokunulmadı: tournament.js, career.js, data/*.json, game/rules/physics, server.

## Ekranlar (curScreen)
- `tournaments` → `renderTournamentsScreen()`: circuit listesi (isim, format, katılım ücreti, şampiyon ödülü, `profile.circuit[id]` en iyi derece, kilit nedeni, format açıklaması). Kilit: `canEnter` + `lockReason()`.
- `tpartner` → `renderTournamentPartnerScreen()`: sadece knockout/league; en yüksek stat ortalamalı karakter önerilir.
- `tournament` → `renderTournamentScreen()`: tur başlığı, americano/mexicano/league'da tur maçları + tablo (`standings`), knockout'ta bracket (tur sütunları). "PLAY YOUR MATCH" / maç yoksa "SIMULATE ROUND" ve "Simulate to end".
- `tresult` → `renderTournamentResultScreen()`: derece, credits, ranking points, yeni dünya sırası.
- `ranking` → `renderRankingScreen()`: `worldRanking(profile, aiRankingTable(characters))`, oyuncu satırı vurgulu.
- Hub: Tournaments ve Ranking kartları aktif; "World rank" artık gerçek (`myWorldRank()`).

## Yardımcı fonksiyonlar
`startTournament` (ücret düş, katılımcıları kur, `createTournament`, kaydet), `launchTournamentMatch(m)`, `settleTournament(p)`, `startScreen()`.

## Nasıl çalışıyor
- Katılımcılar: kadrodan rastgele AI; rating = stat ortalaması + `{rookie:-1.5,club:0,pro:1,legend:2}`; senin rating'in = `profile.stats` ortalaması; çift rating = ikilinin ortalaması. Pair entrant'larına ekstra `members:[charId,...]` alanı eklendi (rosteri kurmak için). 16'lık drawlarda kadro (26) yetmediği için bazı AI'lar birden fazla çiftte tekrar eder.
- Maç: `startMatch` hep `players:4`, sen takım 0. Sen `b` tarafındaysan taraflar yer değiştirilir (`swapped`), rapor edilirken skor geri çevrilir. americano/mexicano `match:{pointsTo:16}` (`?quick` ile 4); knockout/league `{sets:1,goldenPoint:true,superTiebreak:false,starPoint:false}`. Venue = `entry.venue`.
- Ödül: `onEnd` içinde `matchReward`+`applyReward` (normal maç ödülü, `lastReward`), skor `points` (rally) / `games` (set) → `reportResult` → `simulateOthers` → `settleTournament` → `persistProfile` (hepsi tek kayıtta).
- Bitiş: `settleTournament` `isFinished` ise `placement(T,'me')` → `tournamentReward` → credits+rankingPoints eklenir, `profile.circuit[id]=min(eski,yeni)`, `profile.tournament=null`, `profile.tournamentResult` set edilir. Result ekranında Continue ile silinir.
- Devam (resume): turnuva `profile.tournament={entryId,T,partner}` olarak her rapor/simülasyondan sonra kaydedilir. `openCareer()` (`#career` dahil) sırası: lastReward → tournamentResult → tournament → hub. Ödül ekranı Continue'dan sonra turnuva ekranına döner. Maç ortasında kapatılırsa o maç baştan oynanır (maç içi skor saklanmaz).
- Escape/B: tournaments/tournament/ranking → hub, tpartner → tournaments.

## Test / build
- `npm test`: 73 pass, 0 fail. `npx vite build`: temiz (sadece chunk boyutu uyarısı, önceden de vardı).
- Tarayıcıda görsel/elle doğrulama YAPILMADI; `?quick` Club Americano akışı ve yenileme ile devam elle denenmedi. Dev server çalıştırılmadı.

## Bilinen eksikler
- UI için otomatik test yok (DOM gerektirir).
- Maç içi ilerleme resume edilmez.
- Knockout'ta elendikten sonra turnuva "Simulate" ile bitirilir; bracket yalnızca oynanmış/açılmış turları gösterir.
- Gamepad: mevcut focus hareketi kullanıldı; tournament ekranlarına özel kısayol yok.

---

## Opus incelemesi (17 Ekim 2026)

Not: agy kotası dolduğu için bu görevi Sonnet alt-ajanı yaptı (kullanıcı kararı).

Tarayıcıda (`?quick`) doğrulandı: merdiven ekranı (kilit nedenleri, ücret, ödül), Club League → partner seçimi (Görkem) → 20 Credits giriş ücreti → 1. tur bye + "Simulate round" → kendi maçım (takım 0 = Bihter / Görkem, 1 set golden point) → 6–3 galibiyet → ödül +53 (×0.6, Style satırı dahil) → `#career` reload sonrası ödül ekranı → turnuva 3. turdan devam → bitiş: Şampiyon, +200 Credits, +20 ranking, `circuit.club_league = 1`, `tournament: null` → Ranking ekranı (#25 / 27, satır vurgulu). Konsol hatası yok; `npm test` 73/73, build temiz.

Opus düzeltmeleri:
- Çift formatlarında (knockout/league) partner her zaman `characters[0]` geliyordu (`members()` 'me' çiftini atlıyor) → seçilen `tour.partner` kullanılıyor.
- Sol panel ve Profile ekranında "World rank: —" → gerçek sıra.

Küçük, ertelenen: oyuncu bir şablondan türediği için o şablonun AI kopyası da sıralamada/kadroda görünüyor (ör. iki "Bihter").
