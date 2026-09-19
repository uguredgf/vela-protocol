# Teknik Mimari Dokümanı

**Proje (geçici ad):** Vela Protocol — *gizlilik korumalı, AI destekli, gerçek Stellar entegrasyonlu itibar/kredi erişim protokolü*
**Etkinlik:** Stellar Pro Hackathon — Genesis Track, 19-20 Eylül 2026, Grand Pera, İstanbul
**Katılım:** Solo
**Kaynak:** Rise In x Stellar resmi "Pro Hackathon 2026 Tracks & Handbook" dokümanına göre revize edilmiştir.

---

## 1. Problem Tanımı

Geleneksel kredi geçmişi/resmi belgesi olmayan kişiler (göçmen, mülteci, gündelik/gig işçisi, üniversiteli) finansal hizmetlere erişemiyor. Bu sorun için blockchain tabanlı çözümler daha önce denendi (Kiva Protocol, Sierra Leone, 2019) ve konsept doğrulandı, ama merkezi/devlet bağımlı mimarileri sürdürülebilir olmadı.

**Bu projenin farkı:** Kullanıcının itibarını hiçbir merkezi otoriteye ifşa etmeden kriptografik olarak kanıtlamasını sağlamak, bu kanıtı **gerçek bir DeFi borç verme protokolüne (Blend v2)** bağlamak ve onaylanan krediyi **gerçek bir TRY anchor'ı** üzerinden kullanılabilir paraya çevirmek.

---

## 2. Zorunlu Hackathon Gereksinimleriyle Hizalama (Genesis & Scale Track Requirements)

Resmi handbook'a göre her proje şu üçünü karşılamalı:

1. **Integration:** Listelenen bir Stellar protokolü üzerine inşa edilmeli → **Blend v2** (borç verme havuzu protokolü) seçildi.
2. **Anchor / Local Payments:** Gerçek bir fiat rail — kullanıcı TL yatırıp kullanılabilir bakiye çıkarabilmeli veya tersi → **TR Mock Anchor** (`tr-mock-anchor.fly.dev`), SEP-6/10/12/38 standart yoluyla entegre edilecek (tek geçerli yol, API-key yolu kaldırıldı). *Bu kriter Ecosystem Fit içinde diğer her şeyden daha ağırlıklı.*
3. **Core Feature:** Entegrasyon "load-bearing" olmalı, yani ürünün asıl işlevinin parçası olmalı → Blend entegrasyonu olmadan ürün çalışmaz (kredi mekanizmasının kendisi Blend üzerinden yürüyor).

Not: Passkey-Kit resmi handbook'ta **"nice-to-have"** olarak geçiyor, zorunlu değil — yine de dahil ediyoruz çünkü hedef kitlemizin UX'ine gerçekten katkı sağlıyor. Launchtube resmi handbook'ta hiç geçmiyor, kapsam dışı bırakıldı.

---

## 3. Uçtan Uca Akış

1. Kullanıcı **Passkey-Kit** ile biyometrik/cihaz tabanlı akıllı cüzdanını oluşturur/bağlar.
2. Sistem, kullanıcının Stellar Horizon API üzerinden işlem geçmişini çeker (demo'da: gerçekçi sentetik veri seti + gerçek testnet işlemleri karışımı).
3. AI modeli bu veriden 0-100 arası bir **güvenilirlik skoru** üretir (off-chain, açıklanabilir model).
4. İstemci tarafında, skor için bir **commitment** oluşturulur ve skorun belirli bir eşiği geçtiğini kanıtlayan bir **ZK range-proof** üretilir (ham skor/veri hiçbir yere gönderilmez).
5. Proof, bizim **Soroban "gatekeeper" kontratımıza** gönderilir. Bu kontrat:
   - Proof'u doğrular (on-chain verifier)
   - Eşik/skora göre bir teminat indirim oranı belirler
   - **Blend v2 havuz kontratına** cross-contract call ile "bu kullanıcı için indirimli teminatlı pozisyon aç" talimatı verir
6. Blend v2 üzerinden kullanıcıya kredi (ör. USDC) tahsis edilir.
7. Kullanıcı bu bakiyeyi **TRY anchor'ı** (SEP-24 interactive withdraw) üzerinden gerçek Türk lirasına çevirip çeker. (Tersi yönde: TL yatırıp bakiye alma akışı da gösterilerek anchor'ın iki yönlü çalıştığı kanıtlanır.)
8. Arayüz tüm adımları kullanıcıya şeffaf şekilde gösterir.

---

## 4. Katmanlar ve Teknoloji Kararları

### 4.1 Veri Katmanı
- **Kaynak:** Stellar Horizon API (gerçek sorgu) + demo için sentetik ama gerçekçi tamamlayıcı veri seti.
- **Özellikler:** işlem sıklığı, düzenlilik/varyans, ortalama tutar, karşı taraf çeşitliliği, zaman içi tutarlılık.
- **Araçlar:** Python (pandas), Stellar Horizon REST API.

### 4.2 AI / Skorlama Katmanı
- **Model:** Açıklanabilir, hafif model (gradient boosting / lojistik regresyon, scikit-learn).
- **Çıktı:** 0-100 güvenilirlik skoru + kısa açıklanabilirlik notu.
- **Şeffaflık:** Modelin kullanmadığı proxy değişkenler dokümante edilir (sorumlu AI mesajı).

### 4.3 Gizlilik / ZK Katmanı
- **Kapsam sınırı:** zkML (modelin kendi hesaplamasının ZK ile kanıtlanması) KAPSAM DIŞI — 36 saatte gerçekçi değil.
- **Yapılacak:** Basit **commitment + range-proof**: "commit edilen skor ≥ eşik" kanıtı, skor ifşa edilmeden.
- **Araçlar:** Noir veya Circom, Groth16 benzeri zk-SNARK, doğrulama tarafında Soroban'ın desteklediği BLS12-381 ilkelleri.
- **Referans:** developers.stellar.org/docs/build/apps/zk ve apps/privacy sayfaları, ayrıca NethermindEth/stellar-private-payments deposundaki yaklaşımlar incelenmeli.

### 4.4 Blockchain / Akıllı Kontrat Katmanı — Kalbin Merkezi
- **⚠️ Düzeltme (resmi Blend partner sayfası okunduktan sonra):** Blend v2, standart bir **teminatlı** (over-collateralized) borç verme havuzu — Supply/Borrow/Collateral/Liquidation mekaniğiyle çalışır. Protokolün kendisi "kullanıcı bazlı teminat indirimi" diye bir özellik sunmuyor, bunu biz protokolü değiştirmeden, üstüne kurduğumuz bir katmanla sağlamalıyız.
- **Gerçekçi model — "sübvansiyon" (subsidy) yaklaşımı:** Kendi Soroban kontratımız (Rust) bir **havuz/gatekeeper** olarak çalışır:
  1. `verify_proof(proof, public_inputs) -> bool` — ZK kanıtı doğrula
  2. `compute_subsidy(proof_result) -> i128` — skora göre, kullanıcının Blend'e yatırması gereken teminatın bir kısmını **kendi sübvansiyon havuzumuzdan** tamamlama tutarı hesapla (yüksek skor → daha fazla sübvansiyon → kullanıcı daha az kendi parasıyla teminat yatırır)
  3. Kontrat, kendi + kullanıcının teminatını birleştirip **Blend v2 havuzuna normal bir supply/borrow işlemi olarak** gönderir (cross-contract call) — Blend'in kendisi hiçbir özel muamele görmez, sadece tam teminatlı normal bir pozisyon görür
- Bu yaklaşım hem gerçekçi (protokolü değiştirmiyoruz) hem dürüst bir "core feature" hikayesi: ZK-proof + AI skoru, gerçek parasal sonucu (daha az kendi kaynağıyla krediye erişim) doğrudan belirliyor.
- **Depolama:** Ham veri/skor saklanmaz, sadece commitment ve pozisyon durumu. **Storage TTL uyarısı:** `persistent` storage'ın kendi TTL'i var ve süresi dolarsa veri "kaybolur" — sübvansiyon havuzu bakiyesi ve pozisyon kayıtları için TTL uzatma mantığı (`extend_ttl`) unutulmamalı.
- **Auth:** Soroban contract authorization framework.

### 4.5 Anchor / Fiat Rail Katmanı — En Ağırlıklı Kriter
- **⚠️ GÜNCELLEME (9 Eylül):** Anchor, Partner API/dashboard yolunu tamamen kaldırdı. Artık **tek yol SEP-6/10/12/38** — gerçek bir Türk anchor'ının geliştiricilere açacağı yüzeyin bu olduğu için tercih edilmiş. Bu kod testnet'te çalıştıysa, mainnet'te sadece network + home domain değişerek çalışır.
- **Config (sabit değerler):**
  - Home domain: `tr-mock-anchor.fly.dev`
  - Asset: `USDC` (issuer: `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`)
  - Network: Stellar testnet
  - Limitler: işlem başı min 50 / max **3000 TRY**, %0.5 spread
- **Keşif:** Her şey (`/auth`, `/sep6`, `/sep12`, `/sep38`, signing key) `https://tr-mock-anchor.fly.dev/.well-known/stellar.toml`'dan otomatik okunur — hiçbir endpoint sabit kodlanmaz.
- **Akış:**
  1. **SEP-10 login:** `GET /auth?account=G...` → challenge XDR → kullanıcının Stellar key'iyle imzala → `POST /auth` → JWT. *Şifre/API-key yok, kimlik doğrudan cüzdan anahtarı.*
  2. **SEP-6 deposit (TL→USDC):** `GET /sep6/deposit?asset_code=USDC&account=G...&amount=...` → sipariş id + IBAN/referans
  3. **Bankayı simüle et (sandbox):** `POST /sep6/tx/{id}/simulate-bank-transfer`
  4. **Poll:** `GET /sep6/transaction?id=...` → `completed` olunca gerçek testnet USDC cüzdana gelir
  5. **SEP-6 withdraw (USDC→TL, kredi çekiminde kullanılacak asıl yön):** `GET /sep6/withdraw?asset_code=USDC&type=bank_account&amount=...` → treasury adresi + memo → o memo ile USDC gönder → TL "ödenir" (simüle FAST)
  6. **SEP-38** kur kilitleme, **SEP-12** KYC (otomatik onaylı, kişisel veri istemiyor)
- **Araçlar:** `@stellar/typescript-wallet-sdk` (SEP-6/10/38 hazır) + `@creit.tech/stellar-wallets-kit` (bağlanma/imzalama).
- **⚠️ Önemli teknik çelişki — Passkey-Kit ile çakışıyor olabilir:** SEP-10, kullanıcının klasik Stellar anahtar çiftiyle (G-adres) challenge'ı imzalamasını bekliyor. Passkey-Kit ise bir Soroban akıllı cüzdan (kontrat/C-adres, WebAuthn tabanlı) oluşturuyor — bu, klasik SEP-10 imzalama modeliyle doğrudan uyuşmayabilir (anchor'ın kontrat-tabanlı imzacıları desteklediğine dair bir garanti yok, muhtemelen desteklemiyor). **Pratik çözüm:** Passkey-Kit'i AI/ZK gatekeeper girişinde kullan, anchor'a özel (SEP-10/SEP-6) işlemler için ayrı, sıradan bir Stellar keypair kullan — "tamamen seed-phrase'siz" hikayesi sadece ana uygulama girişi için geçerli olur, anchor bacağında değil. Bu, sunumda dürüstçe belirtilmesi gereken bir sınırlama.
- **Deneme ortamı:** `https://tr-mock-anchor.fly.dev/explorer` (tarayıcıda canlı adım adım) veya `demo-wallet.stellar.org`'a home domain girerek.

### 4.6 Kimlik Katmanı (Nice-to-have)
- **Passkey-Kit:** Biyometrik/cihaz tabanlı akıllı cüzdan girişi. Resmi demo chat uygulaması (React versiyonu önerilir, kendi frontend'imiz de React) referans alınacak.

### 4.7 Frontend
- **Framework:** React + Stellar Design System.
- **Ekranlar:** (1) Passkey ile giriş, (2) işlem geçmişi + skor + açıklanabilirlik, (3) proof üretimi durumu, (4) Blend pozisyon onayı, (5) anchor üzerinden TL yatırma/çekme, (6) "verileriniz nerede kullanıldı" şeffaflık paneli.

---

## 5. Teknoloji Yığını (Özet)

| Katman | Teknoloji |
|---|---|
| Veri | Stellar Horizon API, Python/pandas |
| AI | scikit-learn (açıklanabilir model) |
| Gizlilik | Noir/Circom, zk-SNARK (Groth16), BLS12-381 |
| Zincir (kendi kontratımız) | Soroban (Rust/WASM) |
| DeFi entegrasyonu (zorunlu) | Blend v2 |
| Fiat rail (zorunlu, en ağırlıklı) | TR Mock Anchor — SEP-6/10/12/38 (`tr-mock-anchor.fly.dev`) |
| Kimlik (nice-to-have) | Passkey-Kit |
| Frontend | React, Stellar Design System |

---

## 6. Kullanılacak Resmi Stellar Skill Dosyaları (submission'da isimlendirilecek)

- `skills/anchors/SKILL.md` (CheesecakeLabs stellar-anchor-skill) — anchor entegrasyonu
- `skills/standards/SKILL.md` (SEPs, CAPs & Ecosystem) — doğru SEP'i seçmek için
- Blend entegrasyon dokümantasyonu (docs.blend.capital) — resmi "skill" formatında değilse referans olarak README'de belirtilecek
- `stellar-integration-finder` skill — hangi protokolle entegre olunacağına karar verme sürecinde kullanıldıysa belirtilecek

---

## 7. Güvenlik ve Gizlilik İlkeleri
- Ham finansal veri hiçbir zaman zincire veya üçüncü tarafa gönderilmez.
- Kullanıcı hangi verinin skora dahil edildiğini görebilir.
- ZK-proof tek kullanımlık/taze (replay saldırılarına karşı nonce/commitment tazeliği).
- Anchor akışında SEP-12 KYC alanları asgari düzeyde tutulur, gereksiz veri toplanmaz.

## 8. Traction & Continuity Planı
- Hackathon sırasında 5-10 arkadaş, uçtan uca akışı (passkey girişi → skor → proof → Blend pozisyonu → anchor ile TL çekme/yatırma) gerçekten kullanacak — "takım dışı gerçek kullanıcı" kriterini karşılamak için.
- Post-hackathon roadmap: tam zkML entegrasyonu, gerçek mikrofinans kurumu/anchor ortaklığı, model adalet/bias denetimi, mainnet pilotu.

## 9. Geçmiş Kazananlardan Farklılaşma
Hack Pera 2025 birincisi Riskon, on-chain itibar tabanlı teminatsız borç verme yaptı. Bizim farkımız: (1) ham veri hiç ifşa edilmiyor, sadece kriptografik kanıt paylaşılıyor, (2) itibar sinyali AI ile zenginleştirilmiş davranışsal veriden geliyor, (3) gerçek bir DeFi protokolüne (Blend v2) ve gerçek bir fiat rail'e (TRY anchor) bağlanıyor — uçtan uca gerçek para deneyimi sunuyor.

## 10. MVP Kapsamı vs. Roadmap

**36 saatte teslim edilecek (MVP):**
- Sentetik + testnet karışık veri seti, çalışan skorlama modeli
- Commitment + range-proof ZK devresi
- Soroban gatekeeper kontratı + Blend v2 cross-contract entegrasyonu (testnet)
- TRY anchor entegrasyonu (SEP-24, en az bir yön — çekim veya yatırım)
- Passkey-Kit ile giriş
- Uçtan uca demo + 5-10 gerçek kullanıcı testi

**Roadmap:**
- Tam zkML, mainnet pilotu, gerçek mikrofinans ortaklığı, SCF/InstAward başvurusu
