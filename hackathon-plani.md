# Hackathon Yapım Planı — 36 Saat

**Proje:** Vela Protocol (geçici ad)
**Etkinlik:** Stellar Pro Hackathon, Genesis Track — 19-20 Eylül 2026, Grand Pera, İstanbul
**Katılım:** Solo
**Teknik detaylar için:** `teknik-mimari.md`

**Resmi kaynaklar (10 Eylül itibarıyla):**
- Dokümantasyon: `stellar-hackathon-turkiye.vercel.app` — Blend/DeFindex/Soroswap/Aquarius partner rehberleri, SEP entegrasyon adımları, smart contract + anchor kompozisyon örneği burada
- GitHub: `github.com/yigitcangokmen/stellar-hackathon-turkiye`
- **⚠️ Not:** Bazı organizatör duyurularında (özellikle mail/mesaj) Mock Anchor'ın eski "API-key + dashboard" yolu hâlâ anlatılıyor olabilir — bu yol kaldırıldı. **Güncel ve otoriter kaynak, canlı site (`tr-mock-anchor.fly.dev`) ve resmi dokümantasyon** — ikisi de netçe SEP-6/10/12/38'i (API-key yok) doğruluyor. Kafa karışıklığı olursa bu iki kaynağa güven.

**Lojistik (netleşti):**
- Kayıt: 19 Eylül Cumartesi 09:00, Grand Pera
- **İki gün de zorunlu** — sadece bir gün katılan veya ilk gün gelmeyen takımlar değerlendirmeye alınmaz
- Genesis Track'te ~60 proje bekleniyor, en fazla 10 takım finale kalıp jüri karşısında canlı sunum yapacak (finalist olmayan projeler yazılı/video üzerinden değerlendiriliyor demektir — sunum ve dokümantasyon kalitesi bu yüzden kritik)

---

## 0. Hackathon Öncesi Hazırlık (18 Eylül'e kadar)

Solo katıldığın ve zaman kısıtlı olduğu için, 36 saatin büyük kısmını "entegrasyon ve demo cilası"na ayırabilmen için önceden hazırlanabilecek her şeyi önceden hazırla.

**⚠️ En yüksek öncelik — Blend v2 ve Anchor entegrasyonu (mecburi kriterler):**
- [ ] `stellar-hackathon-turkiye.vercel.app/docs/partnerler/blend` ve `.../docs/pro/smart-contract-kompozisyon` sayfalarını oku — resmi örnek kontrat ve akış burada
- [ ] Blend v2 dokümantasyonunu (docs.blend.capital) oku, testnet üzerinde örnek bir supply/borrow işlemi dene
- [ ] Sübvansiyon modelini (bkz. teknik-mimari.md 4.4) netleştir: kontratımız kendi + kullanıcı teminatını birleştirip Blend'e normal bir pozisyon olarak gönderiyor, Blend'in kendisi değişmiyor
- [ ] **⚠️ Anchor yolu değişti (9 Eylül):** API-key/dashboard kaldırıldı, artık tek yol SEP-6/10/12/38. `https://tr-mock-anchor.fly.dev/explorer` üzerinden tarayıcıda canlı akışı izle
- [ ] `demo-wallet.stellar.org`'a home domain olarak `tr-mock-anchor.fly.dev` girip gerçek bir SEP-6 deposit dene — kendi kodunu yazmadan önce akışı elle bir kere yaşa
- [ ] `@stellar/typescript-wallet-sdk` ve `@creit.tech/stellar-wallets-kit` kütüphanelerine bak, SEP-10 login + SEP-6 deposit/withdraw akışını kendi test projende bir kere baştan sona dene
- [ ] **Kritik açık soru:** Passkey-Kit'in ürettiği akıllı cüzdan (kontrat/C-adres) SEP-10'un beklediği klasik anahtar imzalamasıyla uyuşuyor mu? Uyuşmuyorsa, anchor işlemleri için ayrı bir klasik Stellar keypair kullanma planını önceden netleştir — hackathon günü bu soruyla karşılaşıp zaman kaybetme
- [ ] Bu iki entegrasyon çalışmadan diğer maddelere geçme — jüri kriterinde en ağırlıklı olan bunlar

**İkinci öncelik — Passkey-Kit (nice-to-have ama dahil ediyoruz):**
- [ ] Resmi demo chat uygulamasını (React versiyonu) klonla ve çalıştır
- [ ] Passkey-Kit dokümantasyonunu oku, basit bir test projesinde passkey ile cüzdan oluşturup imzalama dene

**Üçüncü öncelik — ZK ve AI katmanları:**
- [ ] Noir veya Circom ile "basit bir commitment + range-proof" örneğini önceden bir kere baştan sona dene
- [ ] Stellar Horizon API'den örnek işlem verisi çekmeyi dene, veri formatını öğren
- [ ] Sentetik veri üretim script'inin iskeletini yaz
- [ ] Basit skorlama modelinin kod iskeletini hazırla (scikit-learn pipeline)

**Diğer hazırlıklar:**
- [ ] Soroban geliştirme ortamını kur, test ağında basit bir kontrat deploy edip dene
- [ ] Freighter veya Passkey-Kit cüzdanı kur, testnet XLM al
- [ ] Proje pitch'ini resmi sunum şablonuna kopyalayıp hazırlamaya başla (şablonu kopyala, doğrudan üzerinde çalışma)
- [ ] "Neden Blend v2, neden bu anchor, Riskon'dan farkımız" argümanlarını netleştir
- [ ] Hackathon günü uçtan uca akışı test edecek 5-10 arkadaşını şimdiden haberdar et — o gün orada/bağlantıda olmaları lazım

Not: Genesis track projeleri sıfırdan başlamalı — önceden yazdığın kodun çoğunu hackathon günü yeniden yazman/entegre etmen gerekebilir. Önceden yaptığın şey kod değil, **öğrenme ve prova** olsun.

---

## Gün 1 — Cuma (Başlangıç, ~10:00) → Cumartesi gece

**09.00-10.00:** Kayıt
**10.00-10.30:** Açılış + hackathon brifingi ve jüri kriterleri özeti
**10.30-11.30:** Workshop #1 — Agentic payments & AI agents on Stellar
**11.40-12.30:** Workshop #2 — SCF Overview
**12.40-13.30:** Workshop #3 — Anchor Integration (TR Mock Anchor'a nasıl gezinileceği gösterilecek — sen önceden entegrasyonu denemiş olacaksın, bu saat çıkan sorunları netleştirmek için iyi bir fırsat)
**13.30-15.00:** Öğle yemeği
**13.00-16.00:** Fikir doğrulama (mentorlarla), hacking başlangıcı

**16.40-18.30: Veri + AI katmanı**
- Sentetik + testnet karışık veri setini üret
- Skorlama modelini eğit, açıklanabilirlik notlarını çıkar

**18.30-19.30:** Akşam yemeği

**19.30 → gece: Soroban gatekeeper kontratı + Blend v2 entegrasyonu**
- Kontratı yaz: proof doğrulama (mock ile başla), teminat hesaplama, Blend'e cross-contract call
- Testnet'e deploy et, Blend testnet havuzuyla gerçek bir pozisyon açmayı dene — bu gecenin en kritik başarı kriteri

---

## Gün 2 — Cumartesi gece → Pazar (Bitiş)

**01.00-02.00:** Kahve molası
**Gece devamı: Anchor entegrasyonu**
- SEP-10 login + SEP-6 withdraw akışını bağla — önceliğimiz off-ramp yönü (Blend'den gelen USDC krediyi TL'ye çevirip "IBAN'a gönderme")
- Passkey-Kit/klasik-keypair ayrımı önceden netleştiyse burada sürpriz olmamalı

**10.00-12.00: ZK katmanı + tam entegrasyon**
- Commitment + range-proof devresini bağla (off-chain proof üretimi → Soroban doğrulama)
- Passkey-Kit ile giriş akışını tamamla
- Uçtan uca zinciri birleştir: passkey girişi → skor → proof → Blend pozisyonu → anchor

**12.00-13.00:** Mentor geri bildirimi + son rötuşlar — **Proje Teslim Son Tarihi → 12:00** (bu saatten önce submission tamamlanmalı)
**12.00-13.00:** Öğle yemeği

**Bu pencerede bir yerde (mümkün olan en erken saatte): Traction testi**
- 5-10 arkadaşını sisteme davet et, gerçekten uçtan uca kullandır (takım dışı gerçek kullanıcı kriteri için)
- Karşılaştıkları sorunları hızlıca düzelt

**13.00-14.30:** Demo Day — Genesis jürisi önünde sunum (max 5 dakika)
**14.30-15.00:** Genesis Track kazanan kararı
**16.00-16.30:** Kapanış + ödül töreni

---

## Submission Kontrol Listesi (teslimden önce mutlaka kontrol et)

- [ ] Çalışan demo (canlı link veya ≤5 dakikalık video)
- [ ] Testnet'e deploy edilmiş kontrat
- [ ] Public GitHub repo + README (ne yapıyor, nasıl çalıştırılır, kim yaptı)
- [ ] Çözülen problemin kısa açıklaması
- [ ] Blend v2 entegrasyonu load-bearing şekilde çalışıyor mu — kontrol et
- [ ] Anchor akışı (TL yatırma/çekme) gerçekten çalışıyor mu — kontrol et
- [ ] Kullanılan resmi Stellar skill dosyaları isimleriyle README'de belirtildi mi
- [ ] Teknik tasarım dokümanı eklendi mi (bkz. `teknik-mimari.md`)
- [ ] Resmi sunum şablonu kullanıldı mı
- [ ] Takım dışı en az birkaç gerçek kullanıcı sistemi denedi mi

---

## Risk Yönetimi Notları

- **En büyük risk:** Blend v2 cross-contract call — anchor artık somut ve önceden prova edilebilir olduğu için risk seviyesi düştü, ama Blend entegrasyonu hâlâ hiç denenmedi ve mecburi/en ağırlıklı kriterlerden biri. Hackathon öncesi mutlaka dokümantasyonu okuyup en az bir kere denemiş ol.
- **Yeni risk — Passkey-Kit ↔ SEP-10 uyuşmazlığı:** Anchor artık sadece SEP-6/10 yolunu kabul ediyor ve SEP-10 klasik Stellar anahtarıyla imzalama bekliyor; Passkey-Kit'in akıllı cüzdanı (kontrat/C-adres) bununla doğrudan uyuşmayabilir. Hackathon öncesi bunu netleştir, gerekirse anchor işlemleri için ayrı bir klasik keypair kullan.
- **Anchor riski büyük ölçüde azaldı (API netleşti):** TR Mock Anchor'ın SEP-6 akışı `stellar.toml`'dan otomatik keşfediliyor, `demo-wallet.stellar.org` ile elle denenebilir — hackathon öncesi bir kere baştan sona çalıştırmak yeterli.
- **İkinci kırılgan nokta:** ZK proof ↔ Soroban kontrat entegrasyonu.
- **Solo katılım riski:** Mentor desteğini agresif kullan — özellikle Blend entegrasyonu ve anchor akışında takılırsan hemen sor.
- **Zaman aşımı senaryosu:** zkML'e hiç yaklaşma; Blend + anchor + gatekeeper kontratı çalışır hale gelmeden ZK'yı ileri seviyeye taşımaya çalışma — öncelik sırası budur.
