# Görev agy-12: Turnuva ve Sıralama ekranları

Sen Antigravity ajanısın; Claude Opus reviewer. Plan Task 10. `src/careerui.js` üzerine kur.
İzinli komutlar: `ls cat find node "npm test" "npx vite build" wc sed`. Commit ATMA. Rapor: `agents/reports/agy-12-career-tournaments.md`.

## Hazır API (değiştirme)
- `src/tournament.js`: `createTournament({format, entrants, rng})`, `currentMatches(T)`, `myMatch(T)`, `reportResult(T, match, {a, b})`, `simulateOthers(T)`, `standings(T)` → `[{id, points, wins, diff}]`, `isFinished(T)`, `placement(T, id)`. T düz JSON → `profile.tournament = { entryId, T, partner? }` olarak saklanır.
  - americano/mexicano: entrant = oyuncu `{id, name, rating}`, maç tarafı `[id, id]`; senin id'n `'me'`.
  - knockout/league: entrant = çift `{id, name, rating}`, maç tarafı çift id'si; senin çiftinin id'si `'me'` (adı "Sen / Partner").
- `src/career.js`: `tournamentReward(entry, placement)` → `{credits, rankingPoints}`, `canEnter(profile, entry, rank)` → `{ok} | {ok:false, reason:'invite'|'ranking'|'credits'}`, `aiRankingTable(characters)`, `worldRanking(profile, aiTable)`, `matchReward`, `applyReward`.
- `data/tournaments.json` → `circuit` (sıralı merdiven): `{id, name, format, drawSize, minRankingPoints, ai, venue, championPoints, entryFee, inviteTop?}`.
- `startMatch` sonucu: `{won, gamesWon, pointsWon, points:[t0,t1], games:[t0,t1], scoring, ai, score}` (Opus `points`/`games` ekledi; takım 0 = sen).

## Ekranlar
- **Tournaments** (hub kartı aktif): merdiven listesi; her satır: isim, format, katılım ücreti, şampiyon ödülü (ranking + credits), en iyi derecen (`profile.circuit[id]`). Kilitliyse gereksinim ("Needs 80 ranking pts" / "Invitation: world top 8"). Format açıklaması (tek satır): Americano "Partners rotate every round; every rally is a point, first to 16." Mexicano "Round 1 is random, then 1st+4th play 2nd+3rd by the table." Knockout "Lose once and you are out. One set to 6." League "Everyone plays everyone; table by wins, then game difference."
- **Giriş**: `canEnter` → ücreti düş → katılımcılar: kadrodan rastgele AI (`characters.json`), rating = stat ortalaması + seviye ofseti `{rookie:-1.5, club:0, pro:1, legend:2}[entry.ai]`; senin rating'in = `profile.stats` ortalaması. knockout/league'da önce partner seç (kadrodan; seçmezse en yüksek rating'li uygun karakter önerilir), çift rating = ikilinin ortalaması, `drawSize` kadar çift. → `createTournament`, kaydet.
- **Turnuva ekranı**: tur başlığı ("Round 3 / 7"), americano/mexicano/league'da tablo, knockout'ta bracket (turlar sütun). "Play your match" → `startMatch`: tarafın `a` değilse yer değiştir ki sen hep takım 0 ol; americano/mexicano `match: { pointsTo: 16 }` (URL'de `?quick` varsa `pointsTo: 4`), knockout/league `{ sets: 1, goldenPoint: true, superTiebreak: false, starPoint: false }`, `ai: entry.ai`, `venue` = entry.venue'nun venues.json karşılığı. Senin maçın yoksa (elendin / bye) "Simulate round".
- **onEnd**: `matchReward` + `applyReward` (normal maç ödülü) → skor: rally'de `points`, set'te `games` (yer değiştirdiysen a/b'yi geri çevir) → `reportResult` → `simulateOthers` → kaydet. Hub `#career` ile yeniden açılınca tournament varsa turnuva ekranına dön (önce ödül ekranı).
- **Bitiş**: `isFinished` → `placement(T,'me')` → `tournamentReward` → credits + rankingPoints ekle, `profile.circuit[id] = min(eski, yeni)`, `profile.tournament = null`, kaydet → sonuç ekranı (derece, kazanç, yeni dünya sırası).
- **Ranking** (hub kartı aktif): `worldRanking(profile, aiRankingTable(characters))`, oyuncu satırı vurgulu, hub'daki "World rank" artık gerçek.
- Turnuvadan çıkıp sayfayı kapatınca/yenileyince aynı turdan devam.

## Doğrulama
- `npm test` yeşil, `npx vite build` temiz.
- `?quick` ile Club Americano oyna: 3. turdan sonra sayfayı yenile → kaldığı yerden devam; bitince ödül.
