"""TR uyarlaması: Gemma 3 (270M) için Transformer Explainer modeli.

GPT-2'den farkları (arayüzde de anlatılır):
- Konum bilgisi ayrı bir tabloyla eklenmez: RoPE ile Q ve K vektörleri konuma göre döndürülür.
- Normalizasyon RMSNorm'dur (ortalama çıkarılmaz) ve her alt katmanın hem önünde hem arkasında vardır.
- Dikkatte 4 sorgu (Q) başı tek bir anahtar/değer (K/V) başını paylaşır (GQA). Q ve K ayrıca RMSNorm'dan geçer.
- MLP "kapılı"dır (GeGLU): gelu(kapı(x)) * yukarı(x) → aşağı.
- Katmanların 5'te 6'sı yalnızca son 512 token'a bakar (kayan pencere); arayüzdeki kısa metinlerde fark etmez.
- Sözlük budanmıştır (scripts-tr/gemma_sozluk.py): eski_idler[yeni_numara] = asıl_numara.

Çıktı sözlüğü GPT sınıfıyla aynı biçimdedir (export_to_onnx.py aynı sarmalayıcıyı kullanır):
  block.block_i.attn.head_j.{attn, attn_scaled, attn_masked, attn_softmax, attn_dropout}, linear.output
"""
import math
from dataclasses import dataclass

import torch
import torch.nn as nn
from torch.nn import functional as F


@dataclass
class GemmaConfig:
    vocab_size: int
    n_layer: int = 18
    n_head: int = 4
    n_kv_head: int = 1
    n_embd: int = 640
    head_dim: int = 256
    ara_boyut: int = 2048
    eps: float = 1e-6
    olcek: float = 256 ** -0.5          # query_pre_attn_scalar ** -0.5
    rope_yerel: float = 10000.0         # kayan pencereli katmanlar
    rope_genel: float = 1000000.0       # tam dikkatli katmanlar (her 6. katman)
    genel_katmanlar: tuple = (5, 11, 17)
    block_size: int = 1024


class RMSNorm(nn.Module):
    def __init__(self, n, eps):
        super().__init__()
        self.weight = nn.Parameter(torch.zeros(n))
        self.eps = eps

    def forward(self, x):
        return x * torch.rsqrt(x.pow(2).mean(-1, keepdim=True) + self.eps) * (1.0 + self.weight)


def yarisini_dondur(x):
    x1, x2 = x.chunk(2, dim=-1)
    return torch.cat((-x2, x1), dim=-1)


class Dikkat(nn.Module):
    def __init__(self, c: GemmaConfig, taban: float):
        super().__init__()
        self.c = c
        self.q_proj = nn.Linear(c.n_embd, c.n_head * c.head_dim, bias=False)
        self.k_proj = nn.Linear(c.n_embd, c.n_kv_head * c.head_dim, bias=False)
        self.v_proj = nn.Linear(c.n_embd, c.n_kv_head * c.head_dim, bias=False)
        self.o_proj = nn.Linear(c.n_head * c.head_dim, c.n_embd, bias=False)
        self.q_norm = RMSNorm(c.head_dim, c.eps)
        self.k_norm = RMSNorm(c.head_dim, c.eps)
        self.register_buffer("inv_freq", 1.0 / (taban ** (torch.arange(0, c.head_dim, 2).float() / c.head_dim)),
                             persistent=False)
        self.dict = {}

    def forward(self, x):
        B, T, _ = x.size()
        c = self.c
        q = self.q_norm(self.q_proj(x).view(B, T, c.n_head, c.head_dim)).transpose(1, 2)        # (B, 4, T, 256)
        k = self.k_norm(self.k_proj(x).view(B, T, c.n_kv_head, c.head_dim)).transpose(1, 2)     # (B, 1, T, 256)
        v = self.v_proj(x).view(B, T, c.n_kv_head, c.head_dim).transpose(1, 2)                  # (B, 1, T, 256)

        # RoPE: konum t'deki vektör, t·frekans açısıyla döndürülür
        konum = torch.arange(T, device=x.device, dtype=torch.float32)
        acilar = torch.outer(konum, self.inv_freq)
        acilar = torch.cat((acilar, acilar), dim=-1)
        cos, sin = acilar.cos()[None, None], acilar.sin()[None, None]
        q = q * cos + yarisini_dondur(q) * sin
        k = k * cos + yarisini_dondur(k) * sin

        attn = q @ k.transpose(-2, -1)                           # K/V tek baş: 4 Q başına yayınlanır
        attn_scaled = attn * c.olcek
        gelecek = konum[None, :] > konum[:, None]                # nedensel maske: sonraki token'lar görünmez
        attn_masked = attn_scaled.masked_fill(gelecek[None, None], float('-inf'))
        attn_softmax = F.softmax(attn_masked, dim=-1)
        y = attn_softmax @ v                                     # (B, 4, T, 256)
        for i in range(c.n_head):
            self.dict[f"head_{i}"] = {
                "attn": attn[:, i], "attn_scaled": attn_scaled[:, i], "attn_masked": attn_masked[:, i],
                "attn_softmax": attn_softmax[:, i], "attn_dropout": attn_softmax[:, i],
            }
        y = y.transpose(1, 2).contiguous().view(B, T, c.n_head * c.head_dim)
        return self.o_proj(y)


class MLP(nn.Module):
    def __init__(self, c: GemmaConfig):
        super().__init__()
        self.gate_proj = nn.Linear(c.n_embd, c.ara_boyut, bias=False)
        self.up_proj = nn.Linear(c.n_embd, c.ara_boyut, bias=False)
        self.down_proj = nn.Linear(c.ara_boyut, c.n_embd, bias=False)

    def forward(self, x):
        return self.down_proj(F.gelu(self.gate_proj(x), approximate="tanh") * self.up_proj(x))


class Blok(nn.Module):
    def __init__(self, c: GemmaConfig, i: int):
        super().__init__()
        self.input_layernorm = RMSNorm(c.n_embd, c.eps)
        self.self_attn = Dikkat(c, c.rope_genel if i in c.genel_katmanlar else c.rope_yerel)
        self.post_attention_layernorm = RMSNorm(c.n_embd, c.eps)
        self.pre_feedforward_layernorm = RMSNorm(c.n_embd, c.eps)
        self.mlp = MLP(c)
        self.post_feedforward_layernorm = RMSNorm(c.n_embd, c.eps)

    @property
    def dict(self):
        return {"attn": self.self_attn.dict}

    def forward(self, x):
        x = x + self.post_attention_layernorm(self.self_attn(self.input_layernorm(x)))
        x = x + self.post_feedforward_layernorm(self.mlp(self.pre_feedforward_layernorm(x)))
        return x


class Gemma(nn.Module):
    def __init__(self, c: GemmaConfig):
        super().__init__()
        self.config = c
        self.embed_tokens = nn.Embedding(c.vocab_size, c.n_embd)   # √640 ile ölçeklenmiş hâli yazılır
        self.layers = nn.ModuleList([Blok(c, i) for i in range(c.n_layer)])
        self.norm = RMSNorm(c.n_embd, c.eps)
        self.lm_head = nn.Linear(c.n_embd, c.vocab_size, bias=False)  # ölçeksiz gömme (bağlı ağırlık)
        self.dictionary = {}

    def forward(self, idx):
        x = self.embed_tokens(idx)
        self.dictionary["block"] = {}
        for i, b in enumerate(self.layers):
            x = b(x)
            self.dictionary["block"][f"block_{i}"] = b.dict
        x = self.norm(x)
        self.dictionary["linear"] = {"output": self.lm_head(x[:, [-1], :])}
        return self.dictionary

    @classmethod
    def from_hf(cls, hf_id, eski_idler):
        from transformers import AutoModelForCausalLM
        hf = AutoModelForCausalLM.from_pretrained(hf_id, torch_dtype=torch.float32).eval()
        hc = hf.config
        rp = getattr(hc, "rope_parameters", None) or {  # transformers 5: rope_parameters; 4.x: ayrı alanlar
            "sliding_attention": {"rope_theta": hc.rope_local_base_freq}, "full_attention": {"rope_theta": hc.rope_theta}}
        assert all(v.get("rope_type", "default") == "default" for v in rp.values())
        c = GemmaConfig(vocab_size=len(eski_idler), n_layer=hc.num_hidden_layers, n_head=hc.num_attention_heads,
                        n_kv_head=hc.num_key_value_heads, n_embd=hc.hidden_size, head_dim=hc.head_dim,
                        ara_boyut=hc.intermediate_size, eps=hc.rms_norm_eps, olcek=hc.query_pre_attn_scalar ** -0.5,
                        rope_yerel=rp["sliding_attention"]["rope_theta"], rope_genel=rp["full_attention"]["rope_theta"],
                        genel_katmanlar=tuple(i for i, t in enumerate(hc.layer_types) if t == "full_attention"))
        assert hc.attn_logit_softcapping is None and hc.final_logit_softcapping is None
        model = cls(c)
        sd = {k.removeprefix("model."): v for k, v in hf.state_dict().items()}
        idx = torch.tensor(eski_idler, dtype=torch.long)
        with torch.no_grad():
            emb = sd.pop("embed_tokens.weight")[idx]
            model.embed_tokens.weight.copy_(emb * math.sqrt(c.n_embd))
            model.lm_head.weight.copy_(emb)
            sd.pop("lm_head.weight", None)
            eksik, fazla = model.load_state_dict(sd, strict=False)
            assert set(eksik) == {"embed_tokens.weight", "lm_head.weight"} and not fazla, (eksik, fazla)
        del hf, sd
        import gc; gc.collect()
        return model
