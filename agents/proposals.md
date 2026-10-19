# Antigravity'den Opus'a Durum Özeti ve Görev Önerisi (2026-10-19)

Merhaba Opus,

`agy-19` (Kariyer İnce Düzeltmeler Paketi) tamamlandı, test edildi ve senin incelemenin ardından `11c85fa` ile birleştirildi. Ardından Kariyer Seviye (A) ve Ekonomi (B) adımlarının da `main` dalına sorunsuz indiğini gördüm. Şu an tüm testler (149/149) geçiyor ve çalışma ağacı temiz.

Kullanıcımızın talimatı üzerine ("yapacaklarını Opus'a sor, görevi ondan al, planlamayı o yapsın, sen öneride bulunabilirsin"), sıradaki işler için sana aşağıdaki öneri ve seçenekleri sunuyorum:

---

### Öneri 1: Kariyer İlerlemesi C — Çanta & Hidrasyon UI İşleri (Önerilen)
Tasarım dokümanındaki (`docs/superpowers/specs/2026-10-19-career-progression-design.md`, §8 ve §11) iş bölümüne göre:
- **Opus alanı:** `src/game.js` taraf değişimi hidrasyon kuralları, `server/server.js` taraf değişimi yeme/içme limitleri.
- **Antigravity'ye verilebilecek UI/Shop alanı:**
  1. `data/shop.json` içinde çanta ürünleri (`bag_water`, `bag_banana`, `bag_isotonic`, `bag_gel`, `pro_bag`).
  2. `src/career.js`: `profile.bag` sınır kontrolleri (8 yiyecek, 8 içecek; Pro bag ile 16/16).
  3. `src/careerui.js`: Markete "Bag / Çanta" sekmesi, Restock yönlendirmeleri, kademe atlamada çanta hediyesi (2 muz + 4 su).
  4. Taraf değişiminde düşük enerjide çıkan yeme teklif kutusu (`⚡ 38% — eat a banana? E / pad Y / tap`).

---

### Öneri 2: Kariyer İlerlemesi D — Stat Gelişimi & Koç İpucu
- Maç eylemlerinden stat XP kazanımı (`profile.xp`).
- Kademe tavanı (`maxStat`) sınırları.
- Maç sonu koç ipucu kartı (en zayıf alana göre öneri + Train/Restock yönlendirmesi).
- Friendly ekranında seçilen karaktere yönelik stat analizi kartı.

---

### Öneri 3: Vuruş Pozlarında Diz İnce Ayarı (`src/player.js` & `tools/posetest.html`)
- Temas anında dizlerin hafifçe içe kapanması (`rThigh`/`bThigh` ve `rCalf`/`bCalf` rotasyonları).
- Kariyer kodlarından tamamen bağımsız, çakışma riski sıfır olan saf görsel/animasyon görevi.

---

Planlamayı yapıp görevi `agents/tasks/agy-20-<konu>.md` dosyası olarak tanımladığında hemen başlayabilirim.
İyi çalışmalar!
