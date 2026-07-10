# İstem Mühendisliği

**Dil / Language:** Türkçe · [English](README.en.md)

## Bilgisayar Mühendisliği 4. Sınıf Seçmeli Dersi

### İstemden Bağlam ve Döngü Mühendisliğine

**Versiyon:** 3.4 · **Son güncelleme:** Temmuz 2026  
**Durum:** Taslak — yeni gelişmelere göre güncellenir.

![İstem Mühendisliği yol haritası](infografik.png)

---

## Bu belgeyi kim okuyabilir?

Bu müfredat **Bilgisayar Mühendisliği 4. sınıf** seçmeli dersi içindir. Aynı zamanda ChatGPT benzeri araçlarla çalışan; hukuk, tıp, işletme, eğitim, tasarım vb. alanlardan gelen ve *“yapay zekâya iyi soru sormanın ötesinde sistem kurmak istiyorum”* diyen okuyucular için de anlaşılır yazılmıştır.

**Kod yazamayan okuyucu:** Haftalık “kavramsal” kısımlar ve aşağıdaki sözlük sizin için yeterlidir. Lab/ödev satırları dersin uygulama kısmıdır.

**Kod yazabilen okuyucu:** Sözlük, haftalık plan ve değerlendirme bölümlerini takip edin.

### Bu derse başlamadan ne bilmek iyi olur?


| Seviye                                  | Ne beklenir?                                                             |
| --------------------------------------- | ------------------------------------------------------------------------ |
| **Yeterli**                             | ChatGPT/Claude gibi bir aracı denemiş olmak                              |
| **Ders için ideal**                     | Temel Python (değişken, fonksiyon, dosya okuma); komut satırına aşinalık |
| **Zorunlu değil ama bilinmesi faydalı** | Makine öğrenmesi / derin öğrenme dersi; matematik ağırlıklı YZ bilgisi   |


### API ve maliyet

**Bulut tarafında birincil yol: [OpenRouter](https://openrouter.ai).**  
Tek hesap / tek API anahtarı ile birçok modele (ör. OpenAI, Anthropic Claude, Google Gemini, açık modeller) erişilir. Öğrencilerin **ayrı ayrı OpenAI ve Anthropic’e abone olup çift fatura ödemesi gerekmez.**


| Yol                             | Ne zaman?                                      | Maliyet                                                                 |
| ------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------- |
| **OpenRouter** (önerilen bulut) | Ders lab’ları, ajan, structured output         | Tek cüzdan; kullandığın kadar öde. Düşük maliyetli modeller seçilebilir |
| **Ollama / LM Studio** (yerel)  | Gizlilik, ücretsiz deneme, internetsiz çalışma | API ücreti yok (bilgisayar kaynağı gerekir)                             |


- Anahtarları asla GitHub’a koymayın; `.env` kullanın (`OPENROUTER_API_KEY`).  
- OpenRouter, çoğu istemci için **OpenAI uyumlu** uç nokta sunar (`base_url` değiştirilir) — ayrı “Claude SDK + OpenAI SDK” öğrenmek zorunda değilsiniz.  
- İstek limiti (rate limit) ve token tüketimine dikkat; sınırsız döngü faturayı şişirir (Hafta 11–12).  
- **Maliyet ipucu:** Aynı işi her zaman en pahalı modele vermeyin; basit görevlerde küçük/ucuz model deneyin (Hafta 3 routing).

---

## Bu ders ne hakkında?

ChatGPT gibi araçlarla etkili şekilde konuşabilmek **istem yazma (prompt)** işidir. Gerçek uygulamalarda ise modele *hangi bilgilerin*, *hangi sırayla*, *hangi araçlarla* verileceği ve işin *ne zaman bittiğinin* *hangi kurallarla* çalışacağının kontrolü daha önemlidir ve bu bir mühendislik işidir. Bu ders: iyi istem yazmayı öğretir; sonra bunu **bağlam yönetimi**, **belgeden cevap (RAG)**, **araç kullanan ajan** ve **doğrulayıcılı döngü + mini-harness** ile birleştirerek mühendislik becerisine dönüştürür.

---

## Nasıl okunmalı?

Her konuda üç seviye vardır:


| Etiket               | Anlamı                                                         |
| -------------------- | -------------------------------------------------------------- |
| **Zorunlu (uygula)** | Derste yapılır / ödev olarak teslim edilir                     |
| **Kavramsal (tanı)** | Anlamanız yeterli; kod yazmanız beklenmez (kısa demo olabilir) |
| **İleri okuma**      | Meraklılar ve proje yapmak isteyenler için; zorunlu değil      |


---

## Küçük sözlük

Sektörde İngilizce terimler yaygındır. Tabloda **Türkçe ad (English)** biçiminde yazılmıştır.


| Terim                                         | Kısa tanım                                                                                       | Örnek                                                                          |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| **Büyük dil modeli (LLM)**                    | Metinden metin üreten yapay zekâ modeli                                                          | ChatGPT, Claude veya OpenRouter’daki bir model                                 |
| **Token**                                     | Modelin işlediği küçük metin birimi                                                              | Bir cümlenin 12–20 token’a bölünmesi; sayı ≈ maliyet                           |
| **BPE (Byte Pair Encoding)**                  | Sık geçen parçaları birleştirerek token sözlüğü kuran yaygın tokenizasyon yöntemi                | Nadir/uzun kelimenin birkaç token’a bölünmesi                                  |
| **Token gömme (token embedding)**             | Her token’ı LLM *içinde* sayı vektörüne çeviren katman (cevap üretmek için)                      | Attention’ın üzerinde çalıştığı vektörler; Hafta 2                             |
| **İstem (prompt)**                            | Modele yazdığınız soru veya talimat                                                              | “Bu e-postayı resmi bir dille yeniden yaz.”                                    |
| **Bağlam (context)**                          | Modelin o cevap için gördüğü tüm metin: sistem kuralları, sohbet geçmişi, belgeler, araç listesi | Sohbete yapıştırdığınız PDF parçası                                            |
| **Bağlam penceresi (context window)**         | Bir istekte modele sığdırabileceğiniz en fazla metin (token ile ölçülür)                         | 128K pencere ile uzun belge gönderebilmek; yine de her şeyi göndermek gerekmez |
| **Dikkat bütçesi (attention budget)**         | Modelin bağlamdaki her kelimeye aynı kalitede odaklanamaması                                     | 50 sayfalık metnin ortasındaki bir cümleyi kaçırması                           |
| **Bağlam çürümesi (context rot)**             | Bağlam uzadıkça erken verilen önemli bilginin zayıflaması                                        | 40 mesaj sonra “adım 1’deki kuralı” uygulamaması                               |
| **Yapılandırılmış çıktı (structured output)** | Serbest paragraf yerine sabit alanlı cevap (çoğunlukla JSON)                                     | `{"duygu":"olumlu","güven":0.9}`                                               |
| **Erişim artırımlı üretim (RAG)**             | Önce sizin dosyalarınızdan ilgili parçayı bulup modele ekleyerek cevap üretmek                   | “Bütünleme var mı?” → yönetmelik PDF’inden maddeyi bul → modele ver → cevapla  |
| **Arama gömmesi (embedding, RAG)**            | Metni “anlamca yakın mı?” diye *aramak* için sayıya çevirmek (çoğunlukla ayrı model)             | “tatil izni” ≈ “yıllık izin”; Hafta 8 — token embedding’den farklı amaç        |
| **Örtüşme (overlap)**                         | Ardışık parçaların biraz üst üste binmesi                                                        | %15 overlap ile cümle ortasında kopmayı azaltmak                               |
| **Hibrit arama (hybrid search)**              | Vektör (anlam) + anahtar kelime (BM25) aramayı birlikte kullanmak                                | Madde numarası veya ürün kodunu kaçırmamak                                     |
| **Yeniden sıralama (rerank)**                 | İlk aday listesini ikinci bir modelle yeniden sıralamak                                          | 30 parça bul → en iyi 5’i modele ver                                           |
| **Bağlamsal erişim (contextual retrieval)**   | Parçaya belgedeki yerini anlatan kısa özet ekleyip gömmek                                        | “Bu parça X yönetmeliğinin izin bölümündendir” + parça metni                   |
| **Geç parçalama (late chunking)**             | Önce uzun metni gömüp sonra parça sınırlarını ayırma fikri                                       | Referans yoğun metinlerde sınır kaybını azaltmak                               |
| **Model yönlendirme (model routing)**         | Basit işi ucuz/hızlı modele, zor işi güçlü modele vermek                                         | “Merhaba” → küçük model; uzun analiz → büyük model                             |
| **Gözlemlenebilirlik (observability)**        | Her çağrıda model, token, süre, maliyet, araç adımlarını kaydetmek                               | Log satırı: model=… tokens=… latency_ms=… cost≈…                               |
| **Korkuluk / koruma (guardrails)**            | İstek veya cevabı güvenlik/politika için otomatik süzmek                                         | PII maskeleme; enjeksiyon şüphesinde reddetme                                  |
| **Parçalama (chunking)**                      | Uzun belgeyi arama için küçük parçalara bölmek                                                   | 80 sayfalık PDF’i ~500–1000 kelimelik bölümlere ayırmak                        |
| **Ajan (agent)**                              | Gerektiğinde tanımlı araçları çağırarak iş ilerletebilen sistem                                  | “Bugünün kurunu al, TL’ye çevir” → önce kur API’si, sonra cevap                |
| **Araç çağırma (function / tool calling)**    | Modelin “şu fonksiyonu şu parametrelerle çalıştır” demesi; kodunuz çalıştırır                    | `get_weather(city="Isparta")`                                                  |
| **ReAct (Reason + Act)**                      | Düşün → araç kullan → sonucu oku → gerekirse tekrar et                                           | Önce arama yapar, sonucu görünce ikinci adımı atar                             |
| **Model Bağlam Protokolü (MCP)**              | Araç ve veri kaynaklarını modele bağlamak için ortak bağlantı standardı                          | Aynı takvim aracını farklı sohbet uygulamalarına benzer şekilde bağlamak       |
| **Beceri paketi (skill)**                     | “Bu iş şöyle yapılır” diye yazılmış talimat dosyası (`SKILL.md`); araç değildir                  | “Pull request özeti nasıl yazılır?” adımlarını içeren kılavuz                  |
| **Döngü (loop)**                              | İş bitene veya limit dolana kadar tekrarlayan otomatik çevrim                                    | Kod yaz → test çalıştır → hata varsa düzelt → en fazla 5 kez                   |
| **Doğrulayıcı (verifier)**                    | “Bu çıktı kabul edilebilir mi?” diye konulan otomatik kontrol                                    | Geçerli JSON mu? Cevapta `06` var mı? Testler yeşil mi?                        |
| **Ajan koşum ortamı (harness)**               | Döngüyü saran kurallar: açık araçlar, adım limiti, log, doğrulayıcı                              | Yalnızca `search` ve `calculator` açık; `delete_file` kapalı                   |
| **Araç izin listesi (tool allowlist)**        | Ajanın kullanmasına izin verilen araçların kapalı listesi                                        | İzinli: `search`, `get_weather` · Yasak: e-posta gönderme                      |
| **Bağlam sıkıştırma (compaction)**            | Uzun sohbeti özetleyip özetle devam etmek                                                        | 30 mesajı 1 paragrafa indirip yeni oturuma yapıştırmak                         |
| **Kademeli açma (progressive disclosure)**    | Tüm belgeyi başta vermemek; ihtiyaç oldukça ilgili kısmı okutmak                                 | Önce dosya adları; “3. bölümü oku” deyince yalnızca onu eklemek                |
| **Bağlam zehirlenmesi (context poisoning)**   | Bağlama yanlış veya kötü niyetli metin girince modelin bozulması                                 | Kullanıcı metninde “önceki kuralları yok say” yazması                          |
| **En küçük çalışır ürün (MVP)**               | Dar kapsamlı ama gerçekten çalışan ilk sürüm                                                     | Önce 3 PDF’lik RAG; tüm üniversite arşivi değil                                |
| **OWASP**                                     | Yazılım / LLM uygulamalarında sık görülen güvenlik risklerini listeleyen kuruluş                 | Bu derste LLM Top 10 (2025) listesi                                            |


### Üç kardeş kavram

1. **Araç çağırma (function calling):** Model, sizin yazdığınız bir Python fonksiyonunu çağırabilir.
2. **Model Bağlam Protokolü (MCP):** Bu tür araçların *standart şekilde* bağlanması (derste çoğunlukla tanıtım).
3. **Beceri paketi (skill):** Araç değil; *nasıl çalışılacağını* anlatan talimat paketi.

### ReAct, döngü ve harness — üç katman


| Katman                                | Soru                                                        | Bu derste                                 |
| ------------------------------------- | ----------------------------------------------------------- | ----------------------------------------- |
| **ReAct (Hafta 10)**                  | Model bir adımda ne düşünüp hangi aracı çağırsın?           | Ajanın *iç* davranışı                     |
| **Döngü / loop (Hafta 11)**           | Kaç kez denesin, ne zaman dursun, hangi test “tamam” desin? | Tekrarlayan çevrim + doğrulayıcı          |
| **Koşum ortamı / harness (Hafta 11)** | Hangi araçlar açık, log var mı, izinler sınırlı mı?         | Döngünün dışındaki kurallar ve kontroller |


Kısa özet: ReAct = bir adımda ne yapar · Döngü = ne zaman biter · Harness = hangi izin ve kontrollerle çalışır.

---

## Alanın evrimi (2022–2026) — örneklerle

```text
1) İSTEM          →  “Bana özet yaz” diye iyi sormak
2) BAĞLAM         →  Özet için doğru belgeleri / geçmişi masaya koymak
3) HARNESS        →  Asistana hangi araçları, hangi izinle vermek
4) DÖNGÜ          →  Yaz → kontrol et → düzelt → bitince dur (otomatik)
```

İstem hâlâ temeldir; tek başına yetmez. Ders bu dört katmanı sırayla işler.

---

## Ders Tanıtım Videosu

[İstem Mühendisliği Ders Tanıtım Videosu](https://youtu.be/NW00MA3qW-E)

> Not: Video eski sürümden kalmış olabilir; güncel çerçeve bu README’deki v3 planıdır.

---

## Dersin amacı

Öğrenciler dönem sonunda şunları yapabilir hale gelir:

- Büyük dil modellerinin (LLM) ne olduğunu ve kabaca nasıl çalıştığını anlatmak (token, BPE, token embedding)  
- İyi istem yazmak, istemi sürümlemek ve cevabı **form/JSON** gibi düzenli formatta almak  
- Bulut API (**OpenRouter**) veya yerel model ile denemek; basit **model yönlendirme** fikrini bilmek  
- Modele verilen bilgiyi (bağlamı) bilinçli yönetmek; bağlam hatalarını tanımak  
- Kendi belgelerinden cevap üreten basit bir **RAG** sistemi kurmak (chunking, embedding, kaynak gösterme)  
- Araç kullanan basit bir **ajan** yazmak  
- **Doğrulayıcı + adım limiti + araç izinleri + temel gözlem log’u** içeren küçük bir **döngü / mini-harness** kurmak  
- Başlıca güvenlik risklerini ve basit **guardrail** fikrini tanımak  
- Gerçek bir probleme **küçük ama çalışan** (MVP) çözüm üretmek

MCP, GraphRAG, fine-tuning lab’ı ve gelişmiş bellek ürünleri **tanıma** düzeyindedir. Çok modlu (görüntü/ses) modeller bu dersin kapsamında değildir.

---

## Değerlendirme

**Yaklaşım:** Her hafta küçük ödev + bir klasik vize + dönem sonunda **tek** grup projesi.


| Bileşen              | Ağırlık | Ne beklenir?                                                                           |
| -------------------- | ------- | -------------------------------------------------------------------------------------- |
| **Ödev ve uygulama** | %30     | 6–8 kısa ödev (her biri yaklaşık 1–3 saat). Büyük “proje” değil; tek script + kısa not |
| **Ara sınav (vize)** | %30     | Hafta 1–6: kavramlar + istem yazma + kısa kod okuma (60 dk)                            |
| **Final projesi**    | %40     | 2–3 kişilik grup: çalışan uygulama + sunum + rapor                                     |


- Ödev notu vizeye karışmaz.  
- Ödev örneği: “üç farklı istemi karşılaştır”, “3 PDF ile soru-cevap”, “en fazla 5 adımlı ajan + 5 test”.

### Final projesi (MVP) — net kurallar

- Duyuru: **Hafta 8’den sonra**; teslim: **Hafta 13–14**  
- Zorunlu:
  1. Çalışan kod + kurulum anlatan README
  2. Hangi istemleri neden kullandığınızın kısa belgesi (**istem dosyası / sürüm notu**)
  3. **Ya** belge tabanlı soru-cevap (RAG) **ya** araç kullanan ajan (ikisini birden derin yapmak zorunda değilsiniz)
  4. **Doğrulayıcı:** En az **5 kontrol** (golden set). Örnekler:
    - Çıktı gerçekten JSON mu?  
    - “Ankara’nın plakası?” sorusunda cevapta `06` geçiyor mu?  
    - Ajan yasak bir aracı çağırmıyor mu?  
    - En fazla N adımda bitiyor mu?
  5. RAG seçtiyseniz: cevaplarda **kaynak/alıntı**; ajan seçtiyseniz: **token/süre log’u**
- Bonus (isterseniz): skill dosyası, hazır MCP aracı, compaction, model routing notu, PII maskeleme

**Doğrulayıcı ≠ modelin kendi kendine “doğruyum” demesi.** Sizin yazdığınız otomatik kontrol veya küçük test listesidir.

---

## Haftalık plan (14 hafta)

### Hafta 1 — Üretken yapay zekâya giriş

**Bu hafta ne öğreneceksiniz?** ChatGPT benzeri araçların hangi aileye ait olduğu; istem / bağlam / döngü / harness haritasına ilk bakış.

- Yapay zekâ, makine öğrenmesi, üretken yapay zekâ (bu derste odak: **metin**)  
- Ayırt edici model (sınıflandırır) vs üretken model (yeni içerik üretir)  
- Örnekler: GPT, Claude, Gemini, LLaMA  
- Transformer’a çok kısa giriş  
- **Kavramsal:** İstem → Bağlam → Harness → Döngü haritası (yukarıdaki örneklerle)

**Zorunlu:** İki farklı sohbet aracıyla 5 görev deneyip kısa not yazmak.

---

### Hafta 2 — Model kabaca nasıl çalışır?

**Bu hafta ne öğreneceksiniz?** Metnin modele nasıl girdiğini adım adım görmek: **parçalama (tokenization / BPE)** → **token gömme (token embedding)** → dikkat → sonraki token tahmini → sıcaklık ile örnekleme.

Basit akış:

```text
Metin → token’lara böl (örn. BPE)
     → her token bir vektöre dönüşür (token embedding)
     → self-attention: token’lar birbirine “bakar”
     → model sıradaki token’ı tahmin eder
     → temperature / top-p ile cevap üretilir
```

#### 1) Tokenizasyon

- **Token:** Modelin işlediği küçük metin birimi (kelime, alt kelime veya karakter parçası olabilir)  
- **BPE (Byte Pair Encoding):** Sık geçen karakter/alt kelime çiftlerini birleştirerek sözlük oluşturan yaygın yöntem. Örnek: “yapayzekâ” gibi birleşik yazımlar veya nadir kelimeler birkaç token’a bölünebilir.  
- Neden önemli? Token sayısı ≈ maliyet ve bağlam penceresi tüketimi; aynı cümle farklı modellerde farklı token sayılabilir.  
- **Lab fikri:** Aynı Türkçe cümleyi bir tokenizer ile parçalayıp token listesini ve sayısını görmek.

#### 2) Token gömme (token embedding) — LLM’nin temeli

- Her token, modelin içinde sabit boyutlu bir **sayı vektörüne** çevrilir; attention bu vektörler üzerinde çalışır.  
- Konum bilgisi (position encoding) da eklenir: sıra önemli.  
- **Dikkat (bu ders için kritik ayrım):**  
  - **Buradaki embedding** = LLM’nin iç katmanı (cevap üretmek için).  
  - **Hafta 8’deki embedding** = belge aramak için ayrı (veya benzer) gömme modeli. İkisi “vektör” der ama amaçları farklıdır.

#### 3) Dikkat ve üretim

- Self-attention = “hangi token hangi token’a bakıyor?” (detaylı matematik yok)  
- Next-token prediction = sıradaki parçayı tahmin etmek  
- Model boyutu (7B ≈ ~7 milyar parametre): genelde daha yetenekli ama daha pahalı/ağır  
- Temperature / Top-p: cevabı daha yaratıcı veya daha tutucu yapmak  
- **Kavramsal önizleme:** Çok uzun metinde dikkat dağılması (Hafta 6)

**Zorunlu:**  

1. Aynı cümleyi farklı sıcaklıklarla üretip farkı raporlamak
2. Kısa tokenizer deneyi: bir cümlenin token’lara bölünmesi + yaklaşık token sayısı (BPE fikrini gözlemlemek yeterli)

---

### Hafta 3 — İstem yazma, OpenRouter API ve düzenli çıktı

**Bu hafta ne öğreneceksiniz?** Sistem/kullanıcı mesajı; örnek vererek öğretme; cevabı JSON forma sokma; **tek OpenRouter anahtarı** ile Python’dan model çağırma.

- Zero-shot: örnek vermeden sormak  
- Few-shot: birkaç örnek vererek sormak  
- Chain-of-Thought: “adım adım düşün”  
- **Yapılandırılmış çıktı:** Serbest paragraf yerine `{ "duygu": "olumlu" }` gibi sabit alanlar  
- **OpenRouter kurulumu:** hesap → API key → `.env` (`OPENROUTER_API_KEY`)  
- OpenAI uyumlu istemci: `base_url="https://openrouter.ai/api/v1"` ile aynı SDK kalıbı  
- Aynı kod iskeletiyle farklı modeller denemek (ucuz / güçlü model karşılaştırması)  
- **Model yönlendirme (routing) fikri:** Basit sınıflandırma → ucuz model; zor akıl yürütme → güçlü model (**kavramsal + ödevde iki model**)  
- **İstem sürümleme:** İstemleri koddan ayırıp dosyada tutmak (`prompts/v1.txt`); ne değiştiğini Git’te görmek  
- İstek limiti (rate limit) ve token tüketimi fikri  
- **Kavramsal:** Streaming (cevabın parça parça gelmesi); prompt/prefix caching (tekrarlayan sistem isteminde maliyet düşürme)

**Zorunlu:** OpenRouter kurulumu + few-shot + JSON çıktı ödevi (en az iki farklı model adı ile kısa karşılaştırma) + istemi ayrı dosyada tutma.

> İsteğe bağlı: İleride doğrudan OpenAI/Anthropic anahtarı da kullanılabilir; bu derste **zorunlu değil**.

---

### Hafta 4 — Daha iyi istemler ve ilk güvenlik uyarısı

**Bu hafta ne öğreneceksiniz?** Net talimat, bölüm ayırıcıları, “uzman gibi davran” (persona); kötü niyetli istemle kuralları delme riski.

- Açık ve spesifik yazmak  
- Metni `###` veya XML ile bölmek (modelin karıştırmasını azaltır)  
- **Doğru yükseklik (right altitude):** Ne aşırı katı kural yığını, ne de “iyi ol” kadar muğlak talimat  
- **Talimat hiyerarşisi (instruction hierarchy):** Sistem kuralları > geliştirici talimatı > kullanıcı metni — kullanıcı “önceki kuralları yok say” diyerek sistemi ezmemeli (**kavramsal**; Hafta 12 ile bağ)  
- **Kavramsal:** Birden fazla yol deneme (Self-Consistency), ağaç gibi düşünme (Tree of Thoughts) — uygulamak zorunda değilsiniz  
- İstem enjeksiyonu / jailbreak’e kısa giriş (asıl lab Hafta 12)

**Zorunlu:** Bir meslek için persona istemi + küçük enjeksiyon denemesi.

---

### Hafta 5 — Bilgisayarınızda model çalıştırmak

**Bu hafta ne öğreneceksiniz?** İnternete veri göndermeden yerelde model çalıştırmak; **Ollama** (komut satırı) ve **LM Studio** (görsel arayüz) ile denemek; maliyet ve gizlilik avantajı.

- **Ollama:** Kurulum, model indirme, terminal / API ile çağrı  
- **LM Studio:** Kurulum, model indirme, sohbet arayüzü; isteğe bağlı yerel sunucu (OpenAI uyumlu endpoint)  
- Ne zaman hangisi? Ollama → script/otomasyon için pratik; LM Studio → keşif ve GUI ile deneme için pratik  
- Yerel vs bulut (OpenRouter): gizlilik, maliyet, hız, kalite ödünleşimi  
- Nicemleme (quantization): modeli küçültüp daha zayıf bilgisayarda çalıştırma fikri (**kavramsal**)  
- Token / bağlam penceresi limitini yerelde gözlemleme (Hafta 6’ya köprü)

**Zorunlu:** Ollama **ve** LM Studio’da birer model kurup aynı istemle kısa görev testi + “OpenRouter vs Ollama vs LM Studio” kısa gözlem notu (bilgisayarınız yetmezse birini derin, diğerini kurulum/demo düzeyinde yapın).

---

### Hafta 6 — Bağlam mühendisliği

**Bu hafta ne öğreneceksiniz?** İyi sormak yetmez; masaya *doğru evrakı*, *doğru sırayla* ve *mümkün olduğunca az gürültüyle* koymak gerekir.

#### 1) Bağlam anatomisi (ne girer?)

Modele giden tipik paket:

1. Sistem talimatı (rol ve kurallar)
2. Araç tanımları (varsa)
3. Sohbet geçmişi
4. Dışarıdan eklenen belgeler / RAG parçaları
5. Kullanıcının son mesajı

Alıştırma: Bir sohbet ekran görüntüsünde veya log’da “hangi satır hangi katman?” diye etiketlemek.

#### 2) Bağlam neden bozulur? (hata türleri)


| Sorun                    | Ne olur?                             | Basit çare                                     |
| ------------------------ | ------------------------------------ | ---------------------------------------------- |
| **Context rot**          | Metin uzadıkça önemli bilgi kaybolur | Özetle (compaction), gereksizi at              |
| **Lost-in-the-middle**   | Ortadaki bilgi daha az dikkat çeker  | Önemliyi başa/sona koy; kısalt                 |
| **Gürültü / fazla araç** | Çok seçenek modelin kararını bozar   | Az ve net araç; progressive disclosure         |
| **Context poisoning**    | Yanlış/zararlı metin bağlama girer   | Kaynak kontrolü, ayırıcılar (Hafta 12 ile bağ) |


#### 3) Üç temel strateji

- **Compaction:** Uzun geçmişi özetleyip yeni pencerede devam  
- **Progressive disclosure / JIT:** Her şeyi başta yapıştırma; dosya yolunu ver, ihtiyaç olunca oku  
- **Yüksek sinyal / düşük token:** Aynı işi daha az ama daha seçilmiş metinle yaptırmak

**Zorunlu lab (ikisini de deneyin, birini ödevde derinleştirin):**  

1. Compaction: uzun bir sohbeti özetleyip devam — özetten önce/sonra cevap kalitesi notu
2. JIT: büyük bir metni komple context’e gömmek vs. parça parça okutmak — token ve kalite karşılaştırması

**Ödev:** Kısa rapor (en fazla 1 sayfa): “Hangi strateji ne zaman? Bir başarısız bağlam örneği + düzeltme.”

**Kavramsal:** Alt ajanlara iş bölerek bağlamı ayırma (sub-agent isolation) — kod yok.  
**İleri okuma:** Anthropic context engineering yazısı.

---

### Hafta 7 — Ara sınav (vize)

Hafta 1–6: kavramlar, istem tasarımı, yapılandırılmış çıktı, yerel model, **bağlam anatomisi ve stratejileri**.  
Format: kısa cevap + istem yazma + kısa kod okuma · 60 dakika.

---

### Hafta 8 — RAG: Belgelerinizden cevap

**Bu hafta ne öğreneceksiniz?** “Model bilmiyor / uyduruyor” sorununa pratik çözüm: belgeyi **doğru parçala** → göm → ara → ilgili parçayı modele ver → cevap üret. Bu, bağlam mühendisliğinin *erişim* ayağıdır. Çoğu zayıf RAG, modelden değil **kötü parçalamadan** kaynaklanır.

Basit (naive) akış:

```text
Belgeler → parçala (chunking) → göm (embedding) → sakla (vektör DB)
       → sorguya yakın parçaları bul → modele ekle → cevap üret
```

#### Neden RAG?

- Modelin bilgi kesiti (eski / genel bilgi)
- Uydurma (hallucination) riskini azaltmak
- Kurum / ders / şirket belgelerine dayandırmak

#### Parçalama (chunking) — bu haftanın omurgası


| Strateji                          | Ne yapar?                                                  | Ne zaman?                                |
| --------------------------------- | ---------------------------------------------------------- | ---------------------------------------- |
| **Sabit boyut**                   | Örn. 500 / 1000 token’lık dilimler                         | Hızlı başlangıç (lab’da zorunlu)         |
| **Örtüşme (overlap)**             | Dilimler biraz üst üste biner (örn. %10–20)                | Cümle/konu sınırında bilgi kopmasın diye |
| **Yapıya duyarlı / özyinelemeli** | Önce başlık, paragraf, cümle sınırına göre bölmeye çalışır | Markdown, rapor, yönetmelik              |
| **Anlamsal (semantic)**           | Konu değişince yeni parça (**kavramsal**)                  | Konu karışık uzun metinler               |
| **Metadata**                      | Kaynak dosya, sayfa, başlık bilgisini parçayla saklamak    | Cevapta alıntı / filtre için             |


**Dikkat:** Parça çok küçük → bağlam eksik. Çok büyük → arama gürültülü ve token pahalı. Lab’da bunu ölçün.

#### Arama gömmesi (embedding) — mini modül (~30–40 dk)

- Amaç: parçayı vektöre çevirip “anlamca yakın” aramak (Hafta 2 token embedding ≠ bu)  
- Benzerlik fikri: yakın vektörler ≈ yakın anlam (cosine benzerliği — formül ezberi yok)  
- Pratik seçim: OpenRouter veya yerel küçük embedding modeli; sorgu ve belgeler **aynı** embedding ailesiyle gömülmeli  
- Tuzaklar: dil uyumsuzluğu, çok kısa/çok uzun chunk, “sadece vektör” ile kod/madde no kaçırma (Hafta 9 hibrit)

#### Diğer bileşenler

- **Vektör DB:** Lab’da **Chroma**; Qdrant vb. isim olarak (**kavramsal**)  
- Bulunan parçalar da **bağlamdır** — alakasız parça = gürültü (Hafta 6 ile bağ)  
- **Kaynak / alıntı (grounding):** Cevapta hangi dosya/parçaya dayandığını göstermek (en az dosya adı + kısa alıntı)

**Zorunlu lab:**  
3 PDF/metin ile RAG + **en az iki chunk ayarı karşılaştırması** (örn. 500 vs 1000 token; overlap 0 vs %15) + cevaplarda **kaynak gösterme**. Kısa not: hangisi hangi tip soruda daha iyi?

**Not:** Final proje konuları bu haftadan sonra netleşir.

#### Ne zaman ne? (karar tablosu — kavramsal)


| İhtiyaç                                       | Genelde tercih                                                         |
| --------------------------------------------- | ---------------------------------------------------------------------- |
| Davranış / format / rol                       | İstem + structured output                                              |
| Güncel veya kurumsal belgeler                 | RAG                                                                    |
| Modelin “üslubunu / alanı” kalıcı değiştirmek | Fine-tuning (**bu derste lab yok**; ne zaman düşünülür bilmek yeterli) |
| Çok adımlı araç kullanımı                     | Ajan + döngü / harness                                                 |


---

### Hafta 9 — Modern RAG iyileştirmeleri

**Bu hafta ne öğreneceksiniz?** 2025–2026’da pratikte sık işe yarayan katmanlar: **hibrit arama**, **yeniden sıralama (rerank)**, **sorgusal dönüşüm**, **bağlamsal / geç parçalama**. Naive “sadece vektör ara” çoğu senaryoda yetmez.

#### Güncel “iyi çalışan” yığın (özet)

```text
Parçala (iyi chunking)
  → Hibrit erişim: yoğun (vektör) + seyrek (BM25 / anahtar kelime)
  → Birleştir (örn. RRF)
  → Rerank (ilk 20–50 → en iyi 3–5)
  → Modele ver + mümkünse kaynak/alıntı
```

İsteğe bağlı üst katmanlar: sorgu yeniden yazma, bağlamsal gömme, ajanın “arayayım mı?” diye karar vermesi.

#### Zorunlu konular (uygula — **birini** lab’da kodlayın)


| Teknik                               | Kısa tanım                                          | Neden trend?                                      |
| ------------------------------------ | --------------------------------------------------- | ------------------------------------------------- |
| **Hibrit arama (hybrid)**            | Vektör + anahtar kelime (BM25) birlikte             | Kod/isim/madde no gibi tam eşleşmeleri kaçırmamak |
| **Yeniden sıralama (rerank)**        | Bulunan adayları ikinci bir modelle sıralamak       | Üstteki 3–5 parçanın kalitesini ciddi artırır     |
| **Sorgu yeniden yazma / genişletme** | Kullanıcı sorusunu aramaya daha uygun hale getirmek | Kısa/muğlak sorularda hatırlamayı iyileştirir     |
| **HyDE**                             | “İdeal cevap metni” üretip onunla aramak            | Soru ile belge dili çok farklıysa                 |


#### Kavramsal (tanı — kod zorunlu değil; 20–25 dk)


| Teknik                                      | Ne işe yarar?                                                                                                          |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Bağlamsal erişim (contextual retrieval)** | Her parçaya, belgedeki yerini anlatan kısa özet ekleyip *sonra* gömmek (Anthropic; yüksek kazanç, indeks maliyeti var) |
| **Geç parçalama (late chunking)**           | Önce uzun metni göm, sonra parça sınırlarını ayır — sınırda anlam kaybını azaltma fikri                                |
| **Ajan tabanlı / uyarlanabilir RAG**        | Model “arayayım mı, sorguyu değiştireyim mi, yeter mi?” diye karar verir (Hafta 10–11 ile bağ)                         |
| **GraphRAG**                                | “Kim kiminle ilişkili?” tipinde çok atlamalı sorular                                                                   |
| **Hafıza (memory) vs RAG**                  | RAG = belgeler; hafıza = kullanıcı/oturum tercihleri (Mem0, Letta)                                                     |
| **ACE**                                     | Bağlamı zamanla iyileşen “oyun kitabı” gibi tutma                                                                      |


**Küçük değerlendirme fikri (golden set):** 5 soruluk sabit set — cevap belgeden mi geliyor (sadakat)? Soruyla ilgili mi (alaka)? Kaynak doğru mu? Aynı seti iyileştirme öncesi/sonrası çalıştırın (basit regression).

**Zorunlu ödev:** Naive RAG (Hafta 8) ile seçtiğiniz **bir** modern tekniği (hibrit / rerank / sorgu yazma / HyDE) aynı 5 soruda karşılaştırın; ½–1 sayfa sonuç + kaynak gösterme.

**İleri okuma:** Anthropic Contextual Retrieval; Late Chunking (arXiv); hibrit arama + RRF özetleri.

---

### Hafta 10 — Ajanlar: Araç kullanan yapay zekâ

**Bu hafta ne öğreneceksiniz?** Modelin sadece yazı yazması değil; hesap makinesi, arama veya sizin fonksiyonunuz gibi araçları çağırması. Araç tanımlarının da *bağlamın parçası* olduğunu görmek.

- Ajan ≈ LLM + araçlar + adımlar  
- ReAct: düşün → araç kullan → sonucu oku → devam et  
- Function calling lab (OpenRouter üzerinden tool-calling destekli bir model)  
- Araç açıklamalarını kısa ve net tutmak (kötü tool description = bağlam gürültüsü)  
- **MCP:** Ortak bağlantı standardı — **demo / kavramsal** (sıfırdan sunucu yazılmaz)  
- **Skill:** Bir iş için `SKILL.md` talimat dosyası yazmak  
- LangChain / CrewAI: var olduklarını bilmek yeterli; zorunlu framework değil  
- **Köprü (Hafta 11):** Bu ajanı sınırsız çalıştırmak tehlikeli — döngü ve harness gerekir

**Zorunlu:** 2–3 araçlı küçük ajan + bir `SKILL.md` ödevi.

---

### Hafta 11 — Döngü ve harness: “Ne zaman bitti? Hangi kurallarla?”

**Bu hafta ne öğreneceksiniz?** Her adımı elle yazmak yerine; hedef, adım limiti, doğrulayıcı ve **mini-harness** (izinler + log) ile otomatik çevrim kurmak.

#### Döngü (loop)

```text
hedef ver → ajan bir adım atsın → doğrulayıcı geçti mi?
  hayır ve adım < N ise tekrar et
  evet ise DUR (başarı)
  adım = N olduysa DUR (limit; başarısız da olsa)
```

- Durma koşulları: test geçti / şema uydu / **insan onayı (HITL)** / adım bitti  
- Sonsuz döngü ve token faturası riski (OWASP LLM10 ile bağ)  
- **Kavramsal:** Andrew Ng’nin üç hızı — (1) ajanın hızlı döngüsü (2) sizin yönlendirmeniz (3) dış dünya / kullanıcı geri bildirimi  
- **Hata / retry:** Araç veya API düşünce patlama; 1–2 kez dene, sonra dur veya kullanıcıya sor  
- **Fallback:** Birincil model/araç yoksa yedek modele veya “cevaplayamıyorum” mesajına düş

#### Mini-harness

Harness = döngüyü saran kabuk. Production Claude Code / Codex seviyesinde olmak zorunda değiliz; şu **kontrol listesini** kodlarız:


| Bileşen                   | Öğrenci uygulaması                                                                    |
| ------------------------- | ------------------------------------------------------------------------------------- |
| Araç allowlist            | Sadece izinli 2–3 fonksiyon çağrılabilir                                              |
| Adım limiti (`max_steps`) | Örn. 5                                                                                |
| Doğrulayıcı               | En az 5 assert / test case                                                            |
| **Gözlem log’u**          | Her adım: model adı, araç, özet sonuç, **token**, **süre (ms)**, yaklaşık **maliyet** |
| Hata davranışı            | Araç hata verirse kaydet → retry veya dur                                             |
| HITL (opsiyonel)          | Silme / gönderim gibi riskli işlerde insan onayı                                      |


**Kavramsal (kod yok):** sandbox, worktree, hook’lar, çok ajanlı orkestrasyon — “varlar, bu derste kurmuyoruz”.

**Zorunlu lab ve ödev:**  
Allowlist + `max_steps` + verifier + **token/süre/maliyet alanlı** adım log’u olan mini ajan döngüsü. README’de 5–7 maddelik “harness kontrol listesi” yazın (hangi kural neden var?).

---

### Hafta 12 — Güvenlik ve “iyi çalışıyor mu?” kontrolü

**Bu hafta ne öğreneceksiniz?** Başlıca riskler; özellikle istem enjeksiyonu, aşırı yetkili ajan, sınırsız tüketim. Ayrıca küçük bir değerlendirme seti. Hafta 11 harness’i güvenlikle birleştirir: allowlist = Excessive Agency’ye karşı pratik savunma.

**OWASP LLM Top 10 (2025) — özet liste:**


| Kod   | Risk (anlaşılır dil)                               |
| ----- | -------------------------------------------------- |
| LLM01 | İstem enjeksiyonu — kullanıcı metni kuralları ezer |
| LLM02 | Hassas bilgi sızdırma                              |
| LLM03 | Tedarik zinciri (kütüphane/model kaynağı)          |
| LLM04 | Veri / model zehirleme                             |
| LLM05 | Model çıktısını güvenmeden çalıştırmak (kod/komut) |
| LLM06 | Aşırı yetki — ajanın gereğinden fazla araç/izini   |
| LLM07 | Sistem isteminin sızması                           |
| LLM08 | Vektör / embedding zayıflıkları (RAG tarafı)       |
| LLM09 | Yanlış bilgi                                       |
| LLM10 | Sınırsız tüketim — kontrolsüz maliyet / istek      |


**Lab odağı:** LLM01, LLM06, LLM10  
**Korkuluklar (guardrails) — kavramsal + kısa uygulama:**  

- Girdi: enjeksiyon kalıpları, aşırı uzun girdi  
- Çıktı: şema doğrulama (zaten var); PII (ad, telefon, TC) sızdırma farkındalığı — basit regex/maskeleme denemesi yeterli  
- “Model cevabını güvenmeden `exec` / shell’e verme” (LLM05)

**Değerlendirme disiplini:**  

- Sabit **golden set** (5–20 örnek) + şema/assert  
- LLM-as-judge kısa bakış  
- BLEU/ROUGE sadece isim olarak

**Zorunlu:** Enjeksiyon örneği + proje için 5’lik doğrulayıcı/golden set taslağı (+ allowlist notu) + kısa PII farkındalık notu.

---

### Hafta 13–14 — Proje sunumları ve kapanış

- Grup başına 15–20 dk (demo şart)  
- Özet: bağlam + döngü + mini-harness; kariyer unvanları değişiyor ama temel beceri **istem + bağlam + doğrulayıcı döngü**  
- Unvan örnekleri: Context Engineer, Agent Engineer, Harness Engineer

---

## Proje teslim listesi

1. GitHub deposu (çalışan kod + README)
2. Mimari / kurulum / istem-bağlam notları / doğrulayıcı açıklaması
3. 3–5 dk demo videosu
4. Sunum (PDF)
5. 5–10 sayfa rapor

### Konu örnekleri

- Ders notlarından soru-cevap (RAG) + 5 test  
- Araçlı araştırma asistanı + adım sınırı + allowlist  
- Quiz üreten bot (JSON şema testleri)  
- E-posta sınıflandırma (yapılandırılmış çıktı)  
- Belge özetleme + compaction denemesi  
- Mini-harness’li ajan (log + max_steps + verifier)

---

## Araçlar

**Derste fiilen kullanacağımız:**

- Python, Pydantic / JSON Schema  
- **OpenRouter** (birincil bulut API — tek anahtar, çok model)  
- `openai` Python SDK (OpenRouter `base_url` ile)  
- **Ollama** ve **LM Studio** (yerel; CLI + GUI)  
- Chroma

**İsim olarak tanıyacağımız:** MCP, Agent Skills, LangChain/CrewAI; OpenAI / Anthropic (doğrudan hesap zorunlu değil)

---

## Kaynaklar

### Kısa / öncelikli

1. [Anthropic — Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
2. [OWASP LLM Top 10 2025](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
3. [OpenRouter Docs](https://openrouter.ai/docs) + OpenAI uyumlu API kullanımı
4. [Anthropic — Contextual Retrieval](https://www.anthropic.com/news/contextual-retrieval)
5. [ReAct: Reasoning and Acting](https://arxiv.org/abs/2210.03629) (Yao et al., 2023) — **özet** okumak yeterli  
6. [Retrieval-Augmented Generation](https://arxiv.org/abs/2005.11401) (Lewis et al., 2020) — **özet** okumak yeterli

### İleri (zorunlu değil)

1. [Context Engineering survey](https://arxiv.org/abs/2507.13334)
2. [ACE](https://arxiv.org/abs/2510.04618)
3. [Hugging Face Context Course](https://huggingface.co/learn/context-course/unit0/introduction)
4. [Model Context Protocol](https://modelcontextprotocol.io)
5. [LangChain — The Anatomy of an Agent Harness](https://www.langchain.com/blog/the-anatomy-of-an-agent-harness) (kavramsal okuma)

### Öğretici siteler

- [Learn Prompting](https://learnprompting.org)
- [Prompting Guide](https://www.promptingguide.ai)
- [DeepLearning.AI — ChatGPT Prompt Engineering for Developers](https://www.deeplearning.ai/short-courses/chatgpt-prompt-engineering-for-developers/)
- [Hugging Face — The Context Course](https://huggingface.co/learn/context-course/unit0/introduction)
- [OpenRouter Docs](https://openrouter.ai/docs)
- [Ollama Docs](https://docs.ollama.com)
- [LM Studio](https://lmstudio.ai)

---

## Dönem sonu çıktıları (kontrol listesi)

- [ ] LLM’nin ne olduğunu; token / BPE / token embedding farkını anlatabiliyorum  
- [ ] İyi istem ve JSON çıktı tasarlayabiliyorum; istemi dosyada sürümleyebiliyorum  
- [ ] OpenRouter, Ollama veya LM Studio ile çalışabiliyorum; ucuz/güçlü model seçebiliyorum  
- [ ] Bağlam / istem farkını örnekle açıklayabiliyorum  
- [ ] Compaction veya JIT ile bağlamı sadeleştirebiliyorum  
- [ ] Basit RAG kurabiliyorum; chunk/overlap ve embedding’i deneyebiliyorum; kaynak gösterebiliyorum  
- [ ] En az bir modern RAG iyileştirmesini (hibrit / rerank / sorgu yazma) açıklayıp deneyebiliyorum  
- [ ] Araçlı mini ajan yazabiliyorum  
- [ ] Allowlist + max_steps + verifier + token/süre log’lu mini döngü/harness kurabiliyorum  
- [ ] MCP ve Skill’in farkını söyleyebiliyorum  
- [ ] OWASP’ten 3 riski ve basit guardrail fikrini örnekleyebiliyorum  
- [ ] MVP bir uygulama teslim edebiliyorum  

---

*Bu müfredat; Bilgisayar Mühendisliği seçmeli dersi standardında, aynı zamanda alana yeni giren okuyucunun da takip edebileceği dilde hazırlanmıştır. Odak: metin tabanlı LLM — istem → bağlam → döngü/mini-harness.*

Sorular ve öneriler: [asimyuksel@sdu.edu.tr](mailto:asimyuksel@sdu.edu.tr)