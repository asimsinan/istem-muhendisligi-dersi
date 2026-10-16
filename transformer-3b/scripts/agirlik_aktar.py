"""Türkçe GPT-2 (ytu-ce-cosmos/turkish-gpt2) ağırlıklarını 3B görünüm için tek ikili dosyaya yazar.

Biçim: [4 bayt başlık uzunluğu (uint32 LE)] [başlık JSON] [veri]
  Başlık: {"config": {...}, "tensorler": [{"ad", "sekil", "tur": "i8"|"f16", "ofset", "bayt", "olcek_ofset"?}]}
  i8  : satır başına simetrik 8 bit (satır = çıktı nöronu); ölçekler f32 olarak ayrıca saklanır
  f16 : küçük tensörler (LayerNorm, sapmalar, konum gömmesi)
Doğrusal katman ağırlıkları llm-viz düzeninde (çıktı, girdi) yazılır; HF Conv1D (girdi, çıktı) olduğundan çevrilir.
Kullanım: python scripts/agirlik_aktar.py [hf_kimliği] [ad]  →  cikti/<ad>.bin  (+ parçalar)
  Türkçe: ytu-ce-cosmos/turkish-gpt2 gpt2-tr-3b (varsayılan) · İngilizce: openai-community/gpt2 gpt2-en-3b --wte16
"""
import json, os, struct, sys
import numpy as np
import torch
from transformers import GPT2LMHeadModel

HF = sys.argv[1] if len(sys.argv) > 1 else "ytu-ce-cosmos/turkish-gpt2"
AD = sys.argv[2] if len(sys.argv) > 2 and not sys.argv[2].startswith("--") else "gpt2-tr-3b"
T_MAKS = 64  # konum gömmesinden saklanan satır (sayfada en fazla bu kadar token)
CIKTI = "cikti"
os.makedirs(CIKTI, exist_ok=True)

m = GPT2LMHeadModel.from_pretrained(HF, torch_dtype=torch.float32).eval()
sd = {k: v.detach().numpy().astype(np.float32) for k, v in m.state_dict().items()}
c = m.config
tensorler, veri = [], bytearray()

def hizala():
    while len(veri) % 4:
        veri.append(0)

def ekle_f16(ad, a):
    hizala(); a = np.ascontiguousarray(a, dtype=np.float16)
    tensorler.append({"ad": ad, "sekil": list(a.shape), "tur": "f16", "ofset": len(veri), "bayt": a.nbytes})
    veri.extend(a.tobytes())

def ekle_i8(ad, a):  # a: (satır, sütun); satır başına ölçek
    a = np.ascontiguousarray(a, dtype=np.float32)
    olcek = np.abs(a).max(axis=1) / 127.0
    olcek[olcek == 0] = 1.0
    q = np.clip(np.round(a / olcek[:, None]), -127, 127).astype(np.int8)
    hizala(); o_ofset = len(veri); veri.extend(olcek.astype(np.float32).tobytes())
    hizala(); ofset = len(veri); veri.extend(q.tobytes())
    tensorler.append({"ad": ad, "sekil": list(a.shape), "tur": "i8", "ofset": ofset, "bayt": q.nbytes, "olcek_ofset": o_ofset})

# OpenAI GPT-2'nin gömme tablosunda birkaç aşırı büyük kanal var: satır başına 8 bit ölçek bunları korurken öteki
# kanalları ezer ve tahminleri belirgin biçimde kaydırır (" was" %18,6 → %11). İngilizce modelde gömme fp16 saklanır.
if "--wte16" in sys.argv:
    ekle_f16("wte", sd["transformer.wte.weight"])
else:
    ekle_i8("wte", sd["transformer.wte.weight"])                 # (V, C) = lm_head (bağlı)
ekle_f16("wpe", sd["transformer.wpe.weight"][:T_MAKS])        # (T_MAKS, C)
for i in range(c.n_layer):
    p = f"transformer.h.{i}."
    ekle_f16(f"h{i}.ln_1.g", sd[p + "ln_1.weight"]); ekle_f16(f"h{i}.ln_1.b", sd[p + "ln_1.bias"])
    ekle_i8(f"h{i}.attn.w", sd[p + "attn.c_attn.weight"].T); ekle_f16(f"h{i}.attn.b", sd[p + "attn.c_attn.bias"])
    ekle_i8(f"h{i}.proj.w", sd[p + "attn.c_proj.weight"].T); ekle_f16(f"h{i}.proj.b", sd[p + "attn.c_proj.bias"])
    ekle_f16(f"h{i}.ln_2.g", sd[p + "ln_2.weight"]); ekle_f16(f"h{i}.ln_2.b", sd[p + "ln_2.bias"])
    ekle_i8(f"h{i}.fc.w", sd[p + "mlp.c_fc.weight"].T); ekle_f16(f"h{i}.fc.b", sd[p + "mlp.c_fc.bias"])
    ekle_i8(f"h{i}.mproj.w", sd[p + "mlp.c_proj.weight"].T); ekle_f16(f"h{i}.mproj.b", sd[p + "mlp.c_proj.bias"])
ekle_f16("ln_f.g", sd["transformer.ln_f.weight"]); ekle_f16("ln_f.b", sd["transformer.ln_f.bias"])

baslik = json.dumps({"config": {"n_layer": c.n_layer, "n_head": c.n_head, "n_embd": c.n_embd, "vocab_size": c.vocab_size,
                                "t_maks": T_MAKS, "kaynak": HF}, "tensorler": tensorler}).encode()
baslik += b" " * ((4 - (len(baslik) + 4) % 4) % 4)
dosya = f"{CIKTI}/{AD}.bin"
with open(dosya, "wb") as f:
    f.write(struct.pack("<I", len(baslik))); f.write(baslik); f.write(veri)
print("✔", dosya, round(os.path.getsize(dosya) / 1e6, 1), "MB")
