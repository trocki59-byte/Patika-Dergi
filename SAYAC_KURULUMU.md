# Patika Dergi ziyaretçi sayacı — Cloudflare Pages + D1

1. Cloudflare Dashboard > Workers & Pages > D1 SQL Database bölümünden `patika-visits` adlı D1 veritabanı oluşturun.
2. D1 veritabanı > Console içinde `counter-schema.sql` dosyasındaki SQL komutunu çalıştırın.
3. Workers & Pages > Patika Dergi Pages projesi > Settings > Bindings > Add > D1 Database: Variable name `VISITS_DB`, database `patika-visits`. Kaydedin.
4. **ÖNEMLİ:** Cloudflare Pages dashboard üzerinden sürükle-bırak (Direct Upload) yöntemi `functions/` kodunu dağıtmayabilir. Sayaç için bu paketi Git deposuna bağlayıp Cloudflare Pages Git deployment ile yayımlayın; `functions/api/visits.js` dosyası proje kökünde olmalı. Alternatif olarak ayrı bir Worker kurmak gerekir. Sadece ZIP yüklemek sayacı etkinleştirmez.
5. Dağıtımdan sonra `https://patikadergi.org/api/visits` adresinde JSON toplam/günlük sayıları görünmelidir. Sayfa yenileme aynı sekmede sayıyı yeniden artırmaz; yeni oturum ve yeni gün sayılır.

Bu sürüm kişileri değil, tarayıcı oturumlarını sayar. Botlar ve birden çok cihaz gerçek tekil kişi sayısı değildir. Önceki CounterAPI sayıları otomatik taşınmaz. Günlük kayıtlar veritabanında tutulur, sayfa yenileme ile sıfırlanmaz. SQL tablosu uzun vadede büyür; gizlilik/retention politikası ayrıca belirlenmelidir.
