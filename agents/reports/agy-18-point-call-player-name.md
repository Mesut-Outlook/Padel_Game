# Görev agy-18 Raporu: Sayı bildiriminde tek oyuncunun adı

**Tarih:** 2026-10-18  
**Ajan:** Antigravity (Gemini 3.8 Flash)  
**Reviewer:** Claude Opus  

---

## 1. Değişiklik Özeti

Kullanıcı talebi doğrultusunda sayı bildirimlerinde çiftler maçında iki kişinin adı yerine hatayı yapan veya sayıyı (winner) alan tek oyuncunun adı ekrana yazılacak şekilde mantık güncellendi. Oyun, set ve maç kazanma bildirimlerinde ise takım isimleri (iki isim birden) korunmaya devam etti.

---

## 2. Mantık Tablosu ve Uygulama

DOM ve three.js bağımlılığı bulunmayan saf `src/pointcall.js` modülü oluşturuldu:

| `e.why` | Kimin Adı (`pid`) | Bildirim Metni (`text`) | Koşul |
|---|---|---|---|
| `hit opponent wall directly` | `lastHitter` | `hit the glass directly` | Hitter kaybeden takımda olmalı |
| `bounced own side` | `lastHitter` | `bounced it on own side` | Hitter kaybeden takımda olmalı |
| `hit own mesh` | `lastHitter` | `hit own fence` | Hitter kaybeden takımda olmalı |
| `double hit` | `lastHitter` | `double hit` | Hitter kaybeden takımda olmalı |
| `out` (kaybeden) | `lastHitter` | `hit it out` | Hitter kaybeden takımda olmalı |
| `out` (kazanan / kourt dışına smaç) | `lastHitter` | `winner` | Hitter kazanan takımda olmalı |
| `double fault` | `lastHitter` (servis atan) | `double fault` | Hitter kaybeden takımda olmalı |
| `volleyed serve` | `lastHitter` | `volleyed the serve` | Hitter kaybeden takımda olmalı |
| `double bounce` | `lastHitter` | `winner` | Hitter kazanan takımda olmalı |

**Yedek Durum (Fallback):**
`lastHitter` tanımsızsa veya tablodaki beklentiyle çelişirse (ör. hata bildiriminde son vuran oyuncu kazanan takımdaysa), `pid: null` dönülerek bugünkü gibi ilgili takımın adı (`$('t0')` veya `$('t1')`) kullanılır.

---

## 3. Değiştirilen Dosyalar ve Fonksiyonlar

1. **`src/pointcall.js` (Yeni dosya)**:
   - `teamOf(pid)`: `pid < 2 ? 0 : 1` fonksiyonu.
   - `pointCall(why, scoringTeam, hitterPid)`: Tablodaki tüm nedenleri değerlendiren saf fonksiyon. `{ pid, team, text }` döner.

2. **`test/pointcall.test.js` (Yeni test dosyası)**:
   - `teamOf maps player indices 0..3 to teams 0 and 1`
   - `pointCall: hit opponent wall directly attributes to losing hitter` (+ contradiction ve null fallback)
   - `pointCall: bounced own side attributes to losing hitter` (+ fallback)
   - `pointCall: hit own mesh attributes to losing hitter` (+ fallback)
   - `pointCall: double hit attributes to losing hitter` (+ fallback)
   - `pointCall: out distinguishes loser error from winner out-of-court smash` (+ fallback)
   - `pointCall: double fault attributes to server` (+ fallback)
   - `pointCall: volleyed serve attributes to receiver` (+ fallback)
   - `pointCall: double bounce attributes winner to scoring hitter` (+ contradiction ve fallback)

3. **`src/main.js`**:
   - `import { pointCall } from './pointcall.js';` eklendi.
   - `handleEvents(events, score, winner)` içindeki `e.type === 'point'` bloğu:
     - Eski `WHY`, `ERRORS`, `isError`, `subjectTeam` mantığı sadeleştirildi.
     - `const call = pointCall(e.why, e.team, hitter);`
     - `const subject = (call.pid != null && avatars[call.pid]?.ch?.name) ? avatars[call.pid].ch.name : (call.team === 0 ? $('t0').textContent : $('t1').textContent);`
     - `if (!tut) flash(\`${subject}\n${call.text}\`, 2.1, kicker);`
     - Maç sonu şampiyonluk anonsunda takım adı garantilendi:
       `const winningTeam = winner === 0 ? $('t0').textContent : $('t1').textContent;`
       `flash(\`🏆 ${winningTeam} WINS!\`, 999, ...);`

---

## 4. Test ve Build Çıktıları

### `npm test`
```
ℹ tests 114
ℹ suites 0
ℹ pass 114
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2674.722692
```

### `npx vite build`
```
dist/tools/padtest.html            2.27 kB │ gzip:   1.02 kB
dist/index.html                   77.62 kB │ gzip:  15.05 kB
dist/assets/padtest-Dhox92Zh.js    2.15 kB │ gzip:   1.13 kB
dist/assets/input-DXnjCvpv.js      2.73 kB │ gzip:   1.31 kB
dist/assets/main-BsUqKSIZ.js     910.11 kB │ gzip: 252.41 kB
✓ built in 3.59s
```
