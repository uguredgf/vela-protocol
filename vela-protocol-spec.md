# Proje Spesifikasyonu — Vela Protocol (geçici ad)

> Bu dosya bir kodlama ajanına (Codex vb.) doğrudan iletilmek üzere hazırlanmıştır. Tüm mimari, teknoloji ve kapsam kararlarını tek yerde toplar. Rise In x Stellar'ın resmi "Pro Hackathon 2026 Tracks & Handbook" dokümanına göre revize edilmiştir.

## 1. Ne İnşa Ediyoruz

Kullanıcının **kendi Stellar hesabındaki işlem geçmişinden** AI ile üretilen bir güvenilirlik skorunu, **ham veriyi hiç ifşa etmeden** ZK-proof ile kanıtlayan; bu kanıtı gerçek bir DeFi borç verme protokolüne (**Blend v2**) bağlayarak indirimli teminatlı kredi erişimi sağlayan; ve onaylanan krediyi gerçek bir **TRY anchor'ı** üzerinden kullanılabilir Türk lirasına çeviren uçtan uca bir prototip.

Bağlam: Stellar Pro Hackathon, Genesis Track (19-20 Eylül 2026, Grand Pera, İstanbul), solo katılım. Genesis track kuralı gereği proje etkinlik süresince sıfırdan yazılacak — bu dosya önceden netleştirilen tasarımı taşımak için var, kod önceden yazılmayacak.

**Hedef:** Sistem olabildiğince optimize ve eksiksiz çalışsın. Kapsam MVP ile sınırlı ama MVP'nin kendisi gösterişli değil, sağlam ve uçtan uca çalışır olmalı.

---

## 2. Zorunlu Hackathon Gereksinimleri (bunlarsız proje değerlendirmeye girmez)

1. **Integration:** Listelenen bir Stellar protokolü üzerine inşa → **Blend v2** (borç verme havuzu).
2. **Anchor / Local Payments:** Gerçek fiat rail — kullanıcı TL yatırıp kullanılabilir bakiye çıkarabilmeli veya tersi → **TRY anchor (SEP-24)**. *Ecosystem Fit kriterinde diğer her şeyden daha ağırlıklı.*
3. **Core Feature:** Entegrasyon "load-bearing" olmalı — Blend olmadan kredi mekanizması çalışmaz.

**Passkey-Kit:** resmi handbook'ta "nice-to-have" — zorunlu değil ama dahil ediliyor (hedef kitle için gerçek UX kazanımı: seed phrase yerine biyometrik giriş).
**Launchtube:** resmi handbook'ta hiç geçmiyor — kapsam dışı bırakıldı, uygulanmayacak.

---

## 3. Uçtan Uca Akış (User Flow)

1. Kullanıcı **Passkey-Kit** ile biyometrik/cihaz tabanlı akıllı cüzdanını oluşturur/bağlar (seed phrase yok).
2. Sistem, kullanıcının Stellar Horizon API üzerinden işlem geçmişini çeker (demo'da: sentetik + testnet karışık veri seti, bkz. Bölüm 6).
3. AI modeli bu veriden 0-100 arası bir **güvenilirlik skoru** üretir (off-chain, açıklanabilir model).
4. İstemci tarafında skor için bir **commitment** oluşturulur ve skorun eşiği geçtiğini kanıtlayan bir **ZK range-proof** üretilir (ham skor/veri hiçbir yere gönderilmez).
5. Proof, bizim yazdığımız **Soroban "gatekeeper" kontratına** gönderilir. Kontrat:
   - Proof'u doğrular (on-chain verifier)
   - Skora göre bir teminat indirim oranı hesaplar
   - **Blend v2 havuz kontratına** cross-contract call ile "bu kullanıcı için indirimli teminatlı pozisyon aç" talimatı verir
6. Blend v2 üzerinden kullanıcıya kredi (ör. USDC) tahsis edilir.
7. Kullanıcı bakiyeyi **TRY anchor'ı** (SEP-24 interactive withdraw) üzerinden gerçek Türk lirasına çevirip çeker. (Ters yön — TL yatırıp bakiye alma — de gösterilerek anchor'ın iki yönlü çalıştığı kanıtlanır.)
8. Arayüz tüm adımları kullanıcıya şeffaf şekilde gösterir ("verileriniz nerede kullanıldı" paneli).

---

## 4. Katmanlar ve Teknoloji Kararları

### 4.1 Veri Katmanı
- **Kaynak:** Stellar Horizon API (gerçek sorgu formatı) + sentetik ama gerçekçi tamamlayıcı veri seti.
- **Özellikler:** işlem sıklığı, düzenlilik/varyans, ortalama tutar, karşı taraf çeşitliliği, zaman içi tutarlılık.
- **Araçlar:** Python (pandas), Stellar Horizon REST API.

### 4.2 AI / Skorlama Katmanı
- **Model:** Açıklanabilir, hafif model (gradient boosting / lojistik regresyon, scikit-learn). Ağır/derin model gerekmiyor.
- **Çıktı:** 0-100 güvenilirlik skoru + kısa açıklanabilirlik notu (hangi sinyaller katkı sağladı).
- **Kısıt:** Modelin kullanmadığı proxy değişkenler (demografik sinyaller) dokümante edilmeli — sorumlu AI mesajı.
- **Servis şekli:** Basit Python (FastAPI/Flask) mikroservisi veya frontend'e gömülü client-side hesaplama — hangisi hızlı entegre olursa o.

### 4.3 Gizlilik / ZK Katmanı — KAPSAM SINIRI KRİTİK
- **YAPILMAYACAK:** zkML (modelin kendi iç hesaplamasının ZK ile kanıtlanması) — araştırma seviyesinde, 36 saatte gerçekçi değil.
- **YAPILACAK:** Basit **commitment + range-proof**: "commit edilen skor ≥ eşik" kanıtı, skorun kendisi ifşa edilmeden.
- **Araçlar:** Noir veya Circom, Groth16 benzeri zk-SNARK, doğrulama tarafında Soroban'ın desteklediği BLS12-381 ilkelleri.
- **Referans:** developers.stellar.org/docs/build/apps/zk ve apps/privacy sayfaları; NethermindEth/stellar-private-payments deposundaki yaklaşımlar.
- **Çıktı:** Proof objesi + public inputs (eşik, commitment) — Soroban kontratına gönderilir.

### 4.4 Blockchain / Akıllı Kontrat Katmanı — Kalbin Merkezi
- **⚠️ Düzeltme (resmi Blend partner sayfası):** Blend v2 standart bir teminatlı (over-collateralized) borç verme havuzu — Supply/Borrow/Collateral/Liquidation. Protokol kendisi "kullanıcı bazlı teminat indirimi" sunmuyor; bunu Blend'i değiştirmeden, üstüne kurduğumuz bir katmanla sağlıyoruz.
- **Gerçekçi model — "sübvansiyon" (subsidy) yaklaşımı:** Kendi Soroban kontratımız ("gatekeeper"):
  1. `verify_proof(proof, public_inputs) -> bool` — ZK kanıtı doğrula
  2. `compute_subsidy(proof_result) -> i128` — skora göre, kullanıcının Blend'e yatırması gereken teminatın bir kısmını **kendi sübvansiyon havuzumuzdan** tamamlama tutarı (yüksek skor → daha fazla sübvansiyon → kullanıcı daha az kendi kaynağıyla teminat yatırır)
  3. Kontrat, kendi + kullanıcının teminatını birleştirip **Blend v2 havuzuna normal bir supply/borrow işlemi olarak** gönderir (cross-contract call) — Blend hiçbir özel muamele görmez, tam teminatlı normal bir pozisyon görür
- Bu, "core feature"/"load-bearing" gereksinimini gerçekçi ve dürüst şekilde karşılar: ZK-proof + AI skoru, doğrudan parasal sonucu (daha az öz kaynakla krediye erişim) belirliyor.
- **Referans:** Blend Docs (docs.blend.capital), resmi hackathon partner rehberi (`stellar-hackathon-turkiye.vercel.app/docs/partnerler/blend`) — "Örnek Senaryo: Mikro Kredi" akışı bizim kullanım örneğimize doğrudan referans.
- **Depolama:** Ham veri/skor saklanmaz, sadece commitment ve pozisyon durumu. **Storage TTL uyarısı:** `persistent` storage'ın ayrı TTL'i var; sübvansiyon havuzu bakiyesi/pozisyon kayıtları için `extend_ttl` mantığı eklenmeli, yoksa veri süresi dolup "kaybolabilir".
- **Auth:** Soroban contract authorization framework.
- **Kompozisyon şablonu (resmi dokümandan):** Anchor SEP-6 deposit → kullanıcı hesabına USDC gelir → USDC bir Soroban kontratına (`deposit` fonksiyonu) yatırılır → kontrat Blend'e supply/borrow eder. Referans Rust iskeleti resmi dokümanda mevcut (`token::Client` ile transfer, `persistent` storage ile bakiye takibi) — Codex bu şablonu temel alıp gatekeeper mantığını üzerine eklemeli.

### 4.5 Anchor / Fiat Rail Katmanı — En Ağırlıklı Kriter
- **⚠️ GÜNCELLEME (9 Eylül):** Anchor API-key/dashboard yolunu kaldırdı. Artık **tek yol SEP-6/10/12/38**.
- **Config:**
  ```
  Home domain:        tr-mock-anchor.fly.dev
  Asset code:         USDC
  Asset issuer:       GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5
  Network:            Stellar testnet
  Network passphrase: Test SDF Network ; September 2015
  Limitler:           min 50 / max 3000 TRY per işlem, %0.5 spread
  ```
  Tüm endpoint'ler `https://tr-mock-anchor.fly.dev/.well-known/stellar.toml`'dan otomatik keşfedilir — sabit kodlama.
- **Akış:**
  1. `GET /auth?account=G...` → challenge XDR → kullanıcı anahtarıyla imzala → `POST /auth` → JWT (SEP-10, şifresiz — kimlik = cüzdan anahtarı)
  2. `GET /sep6/deposit?asset_code=USDC&account=G...&amount=...` → sipariş id + IBAN/referans (TL→USDC)
  3. `POST /sep6/tx/{id}/simulate-bank-transfer` → banka bacağını simüle et (sandbox)
  4. `GET /sep6/transaction?id=...` → poll, `completed` olunca gerçek testnet USDC gelir
  5. `GET /sep6/withdraw?asset_code=USDC&type=bank_account&amount=...` → treasury adresi + memo (USDC→TL, **kredi çekiminde kullanılacak asıl yön**) → o memo ile USDC gönder → TL "ödenir"
  6. `/sep38/*` kur kilitleme, `/sep12/*` KYC (otomatik onaylı, kişisel veri yok)
- **Araçlar:** `@stellar/typescript-wallet-sdk` (SEP-6/10/38 hazır), `@creit.tech/stellar-wallets-kit` (bağlanma/imzalama).
- **⚠️ KRİTİK RİSK — Passkey-Kit ile teknik çelişki olasılığı:** SEP-10, klasik Stellar keypair (G-adres) imzası bekliyor; Passkey-Kit'in ürettiği akıllı cüzdan (kontrat/C-adres, WebAuthn) bu modelle uyuşmayabilir. **Codex için görev:** Bu uyumluluğu implementasyona başlamadan ÖNCE test et. Uyuşmuyorsa: Passkey-Kit'i sadece AI/ZK gatekeeper girişinde kullan, anchor (SEP-10/SEP-6) işlemleri için ayrı bir klasik Stellar keypair oluştur/kullan — "seed-phrase'siz" hikaye o zaman sadece ana giriş için geçerli olur, sunumda dürüstçe belirtilmeli.
- **Deneme:** `https://tr-mock-anchor.fly.dev/explorer` (canlı tarayıcı akışı) veya `demo-wallet.stellar.org` + home domain.
- **Gösterilecek akış:** Blend'den onaylanan USDC kredi → SEP-6 withdraw ile TL'ye çevrilip "IBAN'a gönderilir". Zaman kalırsa tersi (TL yatırıp USDC alma) de gösterilir.

### 4.6 Kimlik Katmanı (Nice-to-have ama dahil)
- **Passkey-Kit:** Biyometrik/cihaz tabanlı akıllı cüzdan girişi. Resmi demo chat uygulaması (React versiyonu — kendi frontend'imizle uyumlu) referans alınacak.

### 4.7 Frontend
- **Framework:** React + Stellar Design System.
- **Ekranlar:** (1) Passkey ile giriş, (2) işlem geçmişi + skor + açıklanabilirlik, (3) proof üretim durumu, (4) Blend pozisyon onayı, (5) anchor üzerinden TL yatırma/çekme, (6) "verileriniz nerede kullanıldı" şeffaflık paneli.

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

## 6. Sentetik Veri Seti Gereksinimi

- **Yüksek güvenilirlik profili:** düzenli aralıklarla (haftalık/aylık) sabit/öngörülebilir tutarlı ödemeler (maaş/remittance benzeri), az sayıda farklı karşı taraf.
- **Düşük güvenilirlik profili:** düzensiz, öngörülemez, çok değişken tutarlı, çok sayıda farklı/tanımsız karşı taraflı işlemler.
- **Orta profiller:** ikisi arası, modelin ayrım gücünü test etmek için.
- Format: JSON — `{account_id, timestamp, amount, counterparty, type}` alanlarını içeren işlem listesi.

---

## 7. Kapsam Sınırları (MVP — Ne Yapılmayacak)

- zkML — YOK.
- Launchtube / gas sponsorluğu — YOK (resmi handbook'ta yok, kapsam dışı).
- Karmaşık/çok adımlı kredi skorlama modeli — YOK, tek modelli basit ve açıklanabilir skor yeterli.
- Çoklu dil/lokalizasyon — YOK.
- Mobil native uygulama — YOK, responsive web yeterli.
- Anchor'ın her iki yönü (yatırma VE çekme) zorunlu değil — en az biri sağlam çalışsın, ikisi de gösterilirse bonus.

---

## 8. Kullanılacak Resmi Stellar Skill Dosyaları (submission'da isimlendirilecek)

- `skills/anchors/SKILL.md` (CheesecakeLabs stellar-anchor-skill) — anchor entegrasyonu
- `skills/standards/SKILL.md` (SEPs, CAPs & Ecosystem) — doğru SEP'i seçmek için
- Blend entegrasyon dokümantasyonu (docs.blend.capital) — resmi skill formatında değilse README'de referans olarak belirtilecek
- `stellar-integration-finder` skill — entegrasyon kararı sürecinde kullanıldıysa belirtilecek

---

## 9. Jüri Değerlendirme Kriterleriyle Hizalama

- **Anlamlı fikir & gerçek dünya etkisi:** Problem net (geleneksel kredi geçmişi olmayan kesimin finansal dışlanması), literatürle desteklenmiş (Kiva Protocol emsali, 2019, Sierra Leone).
- **Teknik uygulama:** Testnet'e deploy, uygun storage/auth kullanımı, Passkey nice-to-have olarak dahil.
- **Ekosistem uyumu:** Blend v2 ile load-bearing entegrasyon, TRY anchor ile gerçek fiat rail (en ağırlıklı kriter), kullanılan skill dosyaları isimleriyle belirtilir.
- **Kullanıcı deneyimi:** Basit, adım adım anlaşılır akış.
- **Traction & Continuity:** Hackathon sırasında 5-10 arkadaş uçtan uca akışı gerçekten kullanacak (takım dışı gerçek kullanıcı kriteri); post-hackathon roadmap net.
- **Sunum/dokümantasyon:** Bu dosya + README + resmi sunum şablonu + mimari akış ile karşılanıyor.

---

## 10. Önerilen Uygulama Sırası (Codex için görev sırası)

1. Soroban gatekeeper kontrat iskeleti (mock proof verifier ile) — testnet'e deploy, temel fonksiyonlar çalışsın
2. Blend v2 testnet havuzuyla cross-contract call — basit bir pozisyon açma denemesi (bu en kritik/en riskli adım, erken doğrulanmalı)
3. Sentetik veri üretimi + AI skorlama modeli (bağımsız, kontrattan ayrı test edilebilir)
4. TR Mock Anchor SEP-6/10 entegrasyonu — ÖNCE Passkey-Kit/SEP-10 uyumluluğunu test et, öncelik off-ramp (USDC→TL çekim) yönü
5. Passkey-Kit entegrasyonu (resmi demo uygulaması referans alınarak)
6. ZK devresi (commitment + range-proof) — önce off-chain test, sonra Soroban'a doğrulama entegrasyonu
7. Uçtan uca bağlama: frontend → skor → proof → gatekeeper → Blend → anchor
8. 5-10 gerçek kullanıcıyla (arkadaşlar) traction testi
9. UI/UX cilası ve hata durumlarının ele alınması
10. Demo senaryosunun sabitlenmesi + resmi sunum şablonunun doldurulması
