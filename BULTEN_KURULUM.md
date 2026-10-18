# Patika Dergi ücretsiz bülten kurulumu

Bu paket Cloudflare Worker + D1 ve Resend kullanır. Site dosyalarında anahtar bulunmaz. Gönderim kuyruğu günde en fazla 100 Resend isteği yapar ve 15 dakikada bir çalışır.

## 1. Resend gönderici alan adını doğrulayın

1. Resend hesabında **Domains → Add Domain** yoluyla `patikadergi.org` veya yalnız gönderim için `bulten.patikadergi.org` alan adını ekleyin.
2. Resend’in gösterdiği SPF ve DKIM DNS kayıtlarını Cloudflare DNS’e değerleri değiştirmeden ekleyin.
3. Alan adında mevcut DMARC kaydı yoksa `_dmarc` için başlangıç politikası belirleyin; örneğin teslimatı izlemek için `v=DMARC1; p=none; rua=mailto:trocki22@outlook.com`. Mevcut DMARC kaydını ikinci bir kayıtla çoğaltmayın.
4. Resend panelinde doğrulama tamamlanınca bir API anahtarı oluşturun. Anahtarı bu dosyaya veya `wrangler.jsonc` içine yazmayın.

Resmî kaynak: https://resend.com/docs/dashboard/domains/introduction

## 2. Worker bağımlılıklarını kurun

```bash
cd newsletter-worker
npm install
npx wrangler login
```

## 3. D1 veritabanını oluşturun

```bash
npx wrangler d1 create patika-dergi-bulten
```

Komutun verdiği `database_id` değerini `wrangler.jsonc` içindeki `D1_DATABASE_ID_BURAYA` alanına yazın. Binding adı `DB` olarak kalmalıdır. Şemayı uzak veritabanına uygulayın:

```bash
npx wrangler d1 execute patika-dergi-bulten --remote --file=./schema.sql
```

Resmî kaynak: https://developers.cloudflare.com/d1/get-started/

## 4. Secret değerlerini güvenli biçimde tanımlayın

```bash
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put TOKEN_SECRET
```

İlk komut sorunca Resend API anahtarını yapıştırın. İkinci komut için parola yöneticisinde üretilmiş en az 32 karakterlik rastgele bir sır kullanın. Secret değerlerini Git’e, ZIP’e veya istemci JavaScript’ine eklemeyin.

Resmî kaynak: https://developers.cloudflare.com/workers/configuration/secrets/

## 5. Test edin ve yayımlayın

```bash
npm test
npx wrangler deploy
```

Cloudflare panelinde Worker için **Settings → Domains & Routes → Add → Custom Domain** yoluyla `bulten.patikadergi.org` alan adını bağlayın. Özel alan adı etkinleşmeden sitedeki form üretim API’sine ulaşamaz.

Resmî kaynaklar:

- https://developers.cloudflare.com/workers/configuration/routing/custom-domains/
- https://developers.cloudflare.com/workers/configuration/cron-triggers/

## 6. Canlı kontrol listesi

- Ana sayfadan bir test adresiyle abone olun.
- Doğrulama e-postasının geldiğini ve bağlantının yalnız bir kez çalıştığını kontrol edin.
- D1’de `subscribers.status` değerinin `confirmed` olduğunu doğrulayın.
- Test RSS yazısı eklendiğinde Türkçe abone grubuna yalnız bir e-posta geldiğini kontrol edin.
- E-postadaki abonelikten çıkma bağlantısını sınayın.
- Cloudflare Worker loglarında ve Resend panelinde hata olmadığını kontrol edin.

Not: `feed.xml` dosyasında paket oluşturulduğu anda bulunan sekiz başlangıç yazısı vardır. İlk canlı cron çalışmasından önce bunların abonelere gönderilmesini istemiyorsanız `publications` tablosuna GUID’leri başlangıç kaydı olarak ekleyin veya ilk aboneleri doğrulamadan önce bir kez cron çalıştırın.
