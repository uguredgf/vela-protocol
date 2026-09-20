# Vela Protocol — Claude Devir ve Görünürlük Raporu

Son güncelleme: 20 Eylül 2026  
Raporun referans aldığı commit: `48448de`  
GitHub: `https://github.com/uguredgf/vela-protocol`  
Canlı uygulama: `https://vela-protocol-n9kf.vercel.app/`  
Herkese açık kanıt sayfası: `https://vela-protocol-n9kf.vercel.app/evidence`

## 1. Bu raporun amacı

Bu dosya, projeyi devralacak Claude oturumunun şu üç alanı birbirine karıştırmaması için hazırlanmıştır:

1. Git deposundan doğrudan görebileceği ve doğrulayabileceği şeyler.
2. Yalnızca canlı siteyi açtığında görebileceği davranışlar.
3. Ne Git arayüzünün ne de ilk bakıştaki canlı arayüzün tek başına açıklamadığı, fakat doğru değerlendirme ve değişiklik yapmak için mutlaka bilinmesi gereken mimari sınırlar.

Vela bugün tamamlanmış bir kredi veya lending ürünü değildir. Doğru tanım: **Stellar testnet üzerinde risk sinyali, istemci tarafı commitment, Soroban gatekeeper, Blend collateral-supply ve Anchor SEP entegrasyon yollarını şeffaf sınırlarla gösteren hackathon prototipi**.

---

## 2. Depo düzeni ve gerçek Git kökü

Yerel Git kökü `Pro Hackathon/` dizinidir. Ana proje kaynakları bunun altındaki `vela-protocol/` klasöründedir.

Önemli üst-seviye dosyalar:

- `README.md`: kısa proje özeti ve canlı bağlantılar.
- `vercel.json`: frontend build/deploy ayarları. `vela-protocol/frontend` klasörünü derler ve SPA rotalarını `index.html` dosyasına yönlendirir.
- `.gitignore`: `.env`, build çıktıları, bağımlılıklar ve özel sunum klasörleri gibi dosyaları dışarıda bırakır.
- `docs/screenshots/`: canlı site ve Stellar işlem kanıtı ekran görüntüleri.

Ana kaynak klasörü:

```text
vela-protocol/
├── README.md
├── TESTNET_GATEKEEPER.md
├── ai-scoring/
├── contracts/gatekeeper/
├── frontend/
├── zk-circuit/
└── claude_rapor.md
```

Claude yalnızca `vela-protocol/` klasörünü açarsa üst dizindeki `vercel.json`, ana README ve `docs/screenshots` dosyalarını kaçırabilir. Deploy davranışını değerlendirirken Git kökünü ayrıca incelemelidir.

---

## 3. Claude Git deposunda neleri görebilir?

GitHub veya tam yerel clone erişimi varsa aşağıdakilerin tamamı görünürdür.

### 3.1 Frontend kaynakları

`frontend/src/` altında:

- Login ve hesap seçimi: `components/PasskeyLogin.tsx`
- Skor ekranı: `components/ScoreDisplay.tsx`
- Commitment akışı: `components/ProofGenerator.tsx`
- Blend önizleme ve gönderim: `components/BlendPosition.tsx`
- Anchor SEP akışı: `components/AnchorTransfer.tsx`
- Oturum makbuzu: `components/TransparencyPanel.tsx`
- Bağımsız jüri görünümü: `components/EvidencePanel.tsx`
- Rotalar ve korumalı sayfalar: `App.tsx`
- Zustand oturum durumu: `store/useStore.ts`
- Freighter, Passkey, Anchor, scoring ve Soroban servisleri: `services/`
- Tasarım sistemi ve responsive stiller: `index.css`, `components/ui/`, `components/layout/`

Claude butonların `onClick` davranışını, disabled koşullarını, rota geçişlerini ve hata mesajlarını kaynak koddan görebilir.

### 3.2 Scoring servisi

`ai-scoring/` altında şunlar görünür:

- FastAPI sunucusu ve Vercel entrypoint.
- Horizon işlem okuma kodu.
- Feature extraction mantığı.
- Sentetik veri üretimi.
- Eğitim kodu.
- Sentetik training CSV/JSON dosyaları.
- Eğitilmiş `scoring_model.joblib` modeli.

Bu nedenle modelin gerçek kredi geri ödeme verisiyle değil, sentetik davranış profilleriyle eğitildiği Git’ten açıkça anlaşılabilir.

### 3.3 Soroban kontratı

`contracts/gatekeeper/` altında:

- Gatekeeper entrypoint’leri.
- Commitment ve threshold payload kontrolü.
- Duplicate identity/commitment kayıtları ve TTL davranışı.
- Blend nested call kodu.
- Event ve hata tipleri.
- Mevcut tek regression testi ve snapshot dosyası.

Claude burada kontratın gerçek bir ZK verifier çalıştırmadığını ve istemciden gelen threshold bayrağına güvendiğini doğrulayabilir.

### 3.4 Public testnet dokümantasyonu

- `TESTNET_GATEKEEPER.md`: deploy, initialize, fund ve test işlem hash’leri.
- Ana README: güncel kontrat, Blend pool, Anchor domain, USDC issuer ve public evidence linkleri.
- `frontend/scripts/verify-live-stack.mjs`: canlı bağımlılıkları read-only kontrol eden test betiği.
- `frontend/scripts/verify-anchor-auth.mjs`: SEP-10 imza doğrulama testi.
- `frontend/test-anchor-deposit.mjs`: testnet deposit/withdraw entegrasyon test akışı.

### 3.5 Commit geçmişi

Tam Git erişiminde Claude son değişikliklerin neden yapıldığını commit geçmişinden görebilir. Son önemli commitler:

- `48448de`: Freighter UX sertleştirmesi ve canlı stack doğrulama betiği.
- `7e1ee8d`: Passkey/Freighter/scoring veri kaynağı açıklaması.
- `bae38c5`: eski Passkey recovery, Freighter network hatası ve Anchor health görünümü.
- `92e43a7`: README canlı ekran görüntüleri.
- `22d3197`: modern-classic/glass UI yenilemesi.

---

## 4. Claude Git’te neleri göremez?

### 4.1 İzlenmeyen veya ignore edilen yerel dosyalar

Aşağıdaki dosyalar şu anda GitHub’da değildir:

- `Vela_Protocol_Jury_Deck.pptx`
- `rapor_son.md`

Bunlar Git kökünde untracked kullanıcı dosyalarıdır. Claude yalnızca GitHub’a bakarsa göremez. Bunlar kullanıcıya aittir; açık talimat olmadan silinmemeli veya değiştirilmemelidir.

Git tarafından ignore edilen diğer sınıflar:

- Gerçek `.env` ve `.env.local` dosyaları.
- `.vercel/` yerel proje metadata’sı.
- `node_modules/`, `dist/`, Rust `target/`, Python sanal ortamları ve cache’ler.
- `presentation-private/`.
- Bazı eski özel plan/spec dosyaları Vercel deploy dışında bırakılmıştır.

### 4.2 Deployment paneli ve gizli ortam değerleri

Claude Git’ten şunları göremez:

- Vercel dashboard durumu ve deployment logları.
- Fly.io Anchor makine logları.
- Vercel’de kayıtlı gerçek environment variable değerleri; yalnız `.env.example` ve frontend bundle’a gömülen public `VITE_*` değerleri görülebilir.
- Freighter kullanıcı hesabı, seed, Passkey private key veya tarayıcı credential’ları.
- Browser `sessionStorage` içeriği.

Frontend’e verilen `VITE_*` değişkenleri gizli kabul edilmemelidir; build sonrası browser bundle’ından okunabilirler. Secret hiçbir zaman `VITE_*` içine konmamalıdır.

### 4.3 Harici Anchor backend kaynak kodu

`tr-mock-anchor.fly.dev` Anchor servisinin backend kaynak kodu bu repoda bulunmuyor. Repo yalnızca Anchor client entegrasyonunu ve test scriptlerini içeriyor. Anchor worker problemi varsa Claude bu repodan Fly worker’ı düzeltemez; servis sahibi repo/log erişimi gerekir.

---

## 5. Claude canlı sitede neleri görebilir?

### 5.1 Oturumsuz görülebilenler

Ana sayfada:

- Freighter ile mevcut G-address geçmişini kullanma seçeneği.
- Yeni Passkey identity oluşturma seçeneği.
- Var olan Passkey’i reconnect etme seçeneği.
- Passkey C-address ile scoring kaynağı G-address arasındaki farkın açıklaması.
- Public evidence sayfasına geçiş.

`/evidence` sayfasında:

- Scoring health endpoint’inin canlı sonucu.
- Sparse/Friendbot-only public test hesabının minimum-history filtresinden geçmediği.
- Gatekeeper ve Blend public testnet işlem bağlantıları.
- Commitment, identity, borrow ve Anchor sınırları.
- GitHub kaynak bağlantısı.

### 5.2 Oturum açınca görülebilenler

Korumalı rotalar:

- `/score`
- `/proof`
- `/position`
- `/anchor`
- `/transparency`

Oturum olmadan bu rotalar login sayfasına döner.

Canlı oturumda kullanıcı şunları görebilir:

- Hangi G-address geçmişinin skorlandığı.
- Guided sample ile live Horizon skorunun ayrımı.
- Commitment’ın yerel üretimi.
- Blend collateral/subsidy önizlemesi.
- Anchor gateway reachability ve treasury göstergesi.
- Oturumda oluşan işlem hash’leri ve receipt.

### 5.3 Browser network ve public chain üzerinden görülebilenler

Teknik bir Claude/browser ajanı ayrıca şunları doğrulayabilir:

- Scoring API request/response’ları.
- Horizon public hesap ve işlem geçmişi.
- Soroban RPC kontrat instance’ı.
- Anchor `stellar.toml`, `/health`, SEP endpoint adresleri ve public transaction sayfaları.
- Mercury Passkey indexer health.
- Stellar Expert üzerindeki public testnet işlemleri.

---

## 6. Claude canlı sitede neleri göremez veya güvenilir biçimde test edemez?

### 6.1 Freighter kısıtı

Codex/Claude uygulama içi browser’ları genellikle Chrome/Edge extension’larını yüklemez. Bu ortamda `Connect Freighter` tıklandığında “Freighter was not detected” mesajı doğrudur; bu tek başına uygulama bug’ı değildir.

Gerçek test için:

1. Canlı URL Chrome veya Edge’de açılmalı.
2. Freighter extension kurulu ve unlocked olmalı.
3. Freighter Network `Testnet` olmalı.
4. Kullanıcı site erişim isteğini kendisi onaylamalı.

Otomasyon ajanı Freighter hesap izin veya transaction imza penceresini kullanıcı adına onaylamamalıdır.

### 6.2 Passkey/WebAuthn kısıtı

Passkey credential’ları hostname/RP-ID’ye bağlıdır. Şunlar birbirinden farklıdır:

- `localhost`
- `127.0.0.1`
- Eski Vercel hostname’i
- `vela-protocol-n9kf.vercel.app`

Bir domainde oluşturulan Passkey başka domainde otomatik olarak kullanılamaz. Biyometrik/OS Passkey onayı kullanıcı tarafından yapılmalıdır.

### 6.3 Kullanıcıya özel oturum durumu

Canlı site başka bir browser veya yeni tabda açıldığında önceki session-scoped G-account secret’ını, position kayıtlarını veya Anchor transaction kayıtlarını göremeyebilir. Receipt kalıcı, zincir-geneli bir kullanıcı dashboard’u değildir; ağırlıklı olarak mevcut `sessionStorage` bağlamını gösterir.

### 6.4 Harici worker’ın iç durumu

Anchor `/health` 200 dönse bile async ödeme worker’ının her transaction’ı tamamladığı anlamına gelmez. Gateway erişimi ile payout completion ayrı şeylerdir. Bireysel SEP-6 transaction status ve varsa Stellar hash esas alınmalıdır.

---

## 7. Bilinmesi gereken gerçek hesap mimarisi

Bu bölüm en sık yanlış anlaşılan kısımdır.

### Freighter akışı

- Freighter klasik bir Stellar `G...` hesabı sağlar.
- Vela scoring servisi bu G-address’in public Horizon ödeme geçmişini okur.
- Soroban/Anchor işlemleri gerektiğinde Freighter imza verir.
- Gerçek geçmişe dayalı skor göstermek için en uygun demo girişi budur.

### Passkey akışı

- Passkey-Kit bir Soroban smart-wallet `C...` address oluşturur veya bağlar.
- MVP ayrıca Friendbot-funded, session-scoped bir helper `G...` account oluşturur.
- Scoring, SEP-10 ve Gatekeeper transaction source’u helper G-account’tur.
- Passkey C-address bugün finansal işlemlerin gerçek signer’ı değildir.
- Helper G secret yalnız browser sessionStorage’da tutulur; bu bir production custody/recovery modeli değildir.
- Session mapping kaybolursa reconnect edilmiş Passkey için yeni helper G-account provision edilir.

### Yeni Passkey neden guided sample açar?

Yeni Friendbot hesabının davranışsal ödeme geçmişi yoktur. Account creation veya Friendbot funding kredi davranışı sayılmaz. Bu nedenle yeni/recovered-helper Passkey akışı gerçek skor taklidi yapmak yerine açıkça etiketlenmiş fictional guided sample açar.

---

## 8. Scoring hakkında bilinmesi gereken sınırlar

- Scoring yalnız klasik Stellar G-address için çalışır.
- Minimum canlı sinyal şartı: en az 5 bootstrap dışı davranışsal ödeme ve en az 7 günlük zaman aralığı.
- Model yaklaşık 500 sentetik davranış profiliyle eğitilmiştir.
- Gerçek default, repayment veya kredi performansı outcome’u yoktur.
- Gösterilen sayı model sinyalidir; accuracy, approval probability veya kredi kararı değildir.
- Feature’lar arasında işlem sayısı, sıklık, düzenlilik, counterparty çeşitliliği, net flow ve consistency bulunur.
- Asset değerleri için production-grade fiyat/decimal normalizasyonu yoktur.
- Self-payment/Sybil-loop manipülasyon direnci tamamlanmamıştır.
- Horizon okuması mevcut uygulamada sınırlı transaction penceresine dayanır; tüm tarihçeyi sonsuza kadar indeksleyen bir veri pipeline’ı yoktur.

Claude model performansını anlatırken “yüksek doğruluk”, “default prediction” veya “bank-grade credit score” iddiasında bulunmamalıdır.

---

## 9. Commitment ve proof hakkında bilinmesi gereken sınırlar

- Browser score + salt için SHA-256 commitment oluşturur.
- Public payload 32-byte commitment + 4-byte threshold flag olmak üzere 36 byte’tır.
- `proof` bugün boş/placeholder olabilir.
- Kontrat Groth16, zkML veya başka bir tam ZK verifier çalıştırmaz.
- Kontrat commitment’ın gerçek score’a ait olduğunu veya score’un threshold’u karşıladığını kriptografik olarak doğrulamaz.
- Kontrat client-supplied threshold flag değerine güvenir.

Bu nedenle “private threshold claim” bir format/entegrasyon prototipidir; güvenli eligibility proof’u değildir.

---

## 10. Identity guard hakkında bilinmesi gereken sınırlar

- SEP-10 classic G-address’in Anchor challenge’ını imzalamasını sağlar.
- SEP-12 sandbox bir `customer_id` döndürür.
- Browser bu customer ID’yi SHA-256 hash’ler.
- Gatekeeper tekrar gönderilen aynı hash’i reddeder.
- Kontrat hash’in gerçekten Anchor’dan geldiğini doğrulamaz.
- Anchor-signed attestation yoktur.
- Caller rastgele yeni 32-byte hash seçerek duplicate guard’ı aşabilir.
- Storage kayıtlarının TTL davranışı vardır; bu kalıcı Sybil koruması değildir.

Doğru ifade: “submitted identity hash replay guard prototype”. Yanlış ifade: “KYC is cryptographically verified on-chain” veya “Sybil-resistant identity”.

---

## 11. Blend entegrasyonu hakkında bilinmesi gereken sınırlar

Doğrulanmış olan:

- Gatekeeper testnet kontratı deploy edilmiştir.
- Public fixture transaction başarılıdır.
- 1.0 XLM kullanıcı girdisi + 0.4 XLM subsidy, toplam 1.4 XLM olarak Blend supply path’ine gitmiştir.
- İşlem public testnet üzerinde doğrulanabilir.

Doğrulanmamış veya uygulanmamış olan:

- Fixture placeholder proof ve zero identity hash kullanır.
- Borrow çağrısı yoktur.
- Repay yoktur.
- User withdrawal yoktur.
- Blend pozisyonu kullanıcı address’i yerine Gatekeeper kontratı altında tutulur.
- Kullanıcı fonlarını geri çıkaran entrypoint yoktur.
- UI’deki kapasite canlı reserve/oracle/health-factor sorgusundan gelmez; %75 illustratif varsayımdır ve artık “not a live limit” olarak etiketlenmiştir.

Eski/superseded test deployment’larında kilitli testnet fonlar bulunabilir. Bunları current frontend contract ile karıştırmamak gerekir.

---

## 12. Anchor entegrasyonu hakkında bilinmesi gereken sınırlar

Mevcut public yapılandırma:

- Domain: `tr-mock-anchor.fly.dev`
- Network: Stellar Testnet
- SEP-10, SEP-6, SEP-12 ve SEP-38 endpoint’leri `stellar.toml` üzerinden keşfedilir.
- App signing key, origin ve network passphrase için trust pin uygulamaktadır.
- TRY bank tarafı sandbox/simülasyondur.
- USDC Stellar leg gerçek testnet transaction olabilir.

Son doğrulama:

- `stellar.toml`: erişilebilir.
- SEP-10 challenge/token: çalışıyor.
- SEP-6 request creation: çalışıyor.
- `/health`: erişilebilir ve treasury bakiyesi yüksek.
- Buna rağmen test deposit transaction’ı `pending_anchor` aşamasında uzun süre kalmıştır. Bu muhtemelen harici payout worker gecikmesidir.

Claude gateway health ile transaction completion’ı aynı şey gibi sunmamalıdır. Stellar hash yoksa bank sandbox tarafı bağımsız biçimde chain üzerinde doğrulanamaz.

---

## 13. Receipt/Evidence ekranlarının gerçek kapsamı

### `/evidence`

- Wallet gerektirmeyen jüri sayfasıdır.
- Scoring health’i canlı kontrol eder.
- Sparse public hesabın minimum-history gate sonucunu gösterir.
- Public Gatekeeper ve Blend işlemlerine link verir.
- MVP sınırlarını listeler.

### `/transparency`

- Bir “regulatory audit” değildir.
- Oturumda oluşan scoring, commitment, identity, Blend ve Anchor kayıtlarını plain-language receipt olarak özetler.
- Horizon üzerinden yalnız mevcut tx hash/source/operation/memo gibi transaction evidence kontrollerini yapar.
- Score doğruluğunu, commitment-score bağını, Anchor attestation’ını veya kullanıcının Blend pozisyon sahibi olduğunu kanıtlamaz.

---

## 14. Canlı deploy ve environment bilgisi

Frontend:

- Vercel static Vite deployment.
- Build kaynağı: `vela-protocol/frontend`.
- SPA rewrites üst Git kökündeki `vercel.json` ile yapılır.
- Main branch push sonrası otomatik deploy olur.

Scoring:

- Ayrı Vercel/FastAPI deployment: `https://vela-ai-scoring.vercel.app`.

Anchor:

- Harici Fly deployment: `https://tr-mock-anchor.fly.dev`.
- Backend kodu bu repoda değildir.

Public environment örneği:

```text
VITE_GATEKEEPER_CONTRACT_ID=<public testnet contract>
VITE_SCORING_API_URL=<public scoring API>
VITE_DEMO_MODE=false
```

`.env.example` local scoring URL içerir. Production değerleri Vercel project settings üzerinden verilir.

---

## 15. Son test durumu

20 Eylül 2026 kontrolünde:

- `npm run build`: geçti.
- `npx tsc --noEmit`: geçti.
- `cargo test`: 1 test geçti, 0 hata.
- Python `compileall`: geçti.
- `npm run verify:live`: 9/9 kontrol geçti.
- Frontend shell: HTTP 200.
- Scoring health: online/model loaded.
- Minimum-history gate: sparse hesap doğru biçimde reddedildi.
- Gatekeeper contract instance: live.
- Gatekeeper evidence transaction: başarılı.
- Blend evidence transaction: başarılı.
- Anchor TOML/trust pins: doğru.
- Anchor gateway health: erişilebilir.
- Mercury Passkey recovery indexer: online.
- Korumalı rotalar oturumsuz erişimde login’e yönlendirildi.
- Public Evidence → Interactive Demo geçişi çalıştı.

Bilinen build uyarısı:

- Ana frontend JS bundle yaklaşık 930 KB minified; Vite 500 KB üzeri chunk uyarısı veriyor. Bu işlevsel hata değildir fakat code splitting performans işi olarak kalmıştır.

Canlı kontrol komutu:

```bash
cd vela-protocol/frontend
npm run verify:live
```

---

## 16. Claude değişiklik yapmadan önce neyi kontrol etmeli?

1. Git kökünü ve `vela-protocol/` alt dizinini birlikte incele.
2. `git status --short` çalıştır ve kullanıcıya ait untracked dosyalara dokunma.
3. Canlı davranış soruluyorsa yalnız source okumakla yetinme; live URL ve public servisleri doğrula.
4. Freighter testini in-app browser sonucu üzerinden “bozuk” ilan etme.
5. Passkey hostname/RP-ID sınırını koru.
6. Anchor gateway health ile payout completion’ı ayır.
7. Guided sample’ı gerçek hesap skoru veya submitted position gibi sunma.
8. Public fixture’ı tam E2E eligibility kanıtı gibi sunma.
9. Contract veya UI claim’lerinde gerçek proof, attestation, ownership ve withdrawal sınırlarını saklama.
10. Değişiklikten sonra en az şu kontrolleri çalıştır:

```bash
cd vela-protocol/frontend
npx tsc --noEmit
npm run build
npm run verify:live

cd ../contracts/gatekeeper
cargo test
```

11. Main branch’e push yapıldıysa Vercel asset’in gerçekten yenilendiğini doğrula.
12. Pull request oluşturulmadıysa varmış gibi söyleme; mevcut çalışma doğrudan `main` branch’e push edilmektedir.

---

## 17. Claude’un kullanmaması gereken yanlış iddialar

Şu ifadeler mevcut ürün için kullanılmamalıdır:

- “Production-ready lending protocol.”
- “The AI predicts default risk accurately.”
- “The score is cryptographically verified on-chain.”
- “The commitment is a complete zero-knowledge proof.”
- “Anchor KYC is verified by the contract.”
- “Passkey signs all financial transactions.”
- “The user owns and can withdraw the Blend position.”
- “The displayed borrowing limit is live Blend data.”
- “The Anchor transaction completed” — terminal SEP status/Stellar hash görülmeden.
- “The public fixture proves the full live user journey.”

Tercih edilmesi gereken ifadeler:

- “Demonstrative risk signal.”
- “Synthetic-data hackathon model.”
- “Client-side commitment and threshold claim prototype.”
- “Submitted identity-hash replay guard.”
- “Real testnet collateral-supply integration fixture.”
- “TRY-side Anchor sandbox with verifiable Stellar legs when a hash exists.”
- “Borrow/repay/withdraw and cryptographic eligibility verification are roadmap work.”

---

## 18. Jüri açısından en kritik açık sorular

Claude değerlendirme yaparken şu soruları cevapsız kabul etmelidir:

1. Client `flag=1` gönderdiğinde gerçek score/proof olmadan subsidy alınmasını ne engelliyor?
2. Commitment ile threshold claim arasındaki kriptografik bağ nerede doğrulanacak?
3. Rastgele identity hash ile duplicate guard aşılması nasıl engellenecek?
4. TTL sonrası replay politikası ne olacak?
5. Blend pozisyonunun kullanıcı yerine Gatekeeper altında olmasının custody modeli nedir?
6. Kullanıcı hangi fonksiyonla withdraw yapacak?
7. Passkey ne zaman gerçek transaction signer ve recovery root olacak?
8. Sentetik model gerçek repayment/default verisiyle nasıl kalibre edilecek?
9. Asset fiyat/decimal normalizasyonu ve Sybil/self-payment filtreleri nasıl eklenecek?
10. Jüri cihazında tek parça gerçek score → proof → identity → Blend demo hangi hazırlanmış hesapla yapılacak?

---

## 19. Kısa devir özeti

Projeyi incelerken şu zihinsel modeli kullan:

```text
Freighter G-account history
        │
        ▼
synthetic-model risk signal
        │
        ▼
local commitment + client threshold flag
        │
        ▼
Gatekeeper replay checks
        │
        ▼
real testnet Blend collateral supply

Anchor SEP rail = ayrı interoperability/sandbox akışı
Passkey C-wallet = bugün ağırlıklı identity/onboarding prototipi
```

Vela’nın güçlü yanı, çalışan testnet parçalarını ve çalışmayan/roadmap parçalarını artık açıkça ayırmasıdır. En büyük hata, bu ayrımları ortadan kaldırıp prototipi tamamlanmış özel kredi ürünü gibi yorumlamak olur.
