"""gpt2-tr-3b.bin'den (8 bit, açılmış) NumPy ileri geçişi: llm-viz düzenindeki ara tensörler + HF ile karşılaştırma.
Kullanım: python scripts/referans.py "Türkiye'nin başkenti" 32"""
import json, struct, sys
import numpy as np

def yukle(yol):
    b = open(yol, "rb").read(); n = struct.unpack("<I", b[:4])[0]; h = json.loads(b[4:4 + n]); v = memoryview(b)[4 + n:]
    W = {}
    for t in h["tensorler"]:
        if t["tur"] == "f16":
            W[t["ad"]] = np.frombuffer(v[t["ofset"]:t["ofset"] + t["bayt"]], np.float16).astype(np.float32).reshape(t["sekil"])
        else:
            q = np.frombuffer(v[t["ofset"]:t["ofset"] + t["bayt"]], np.int8).reshape(t["sekil"]).astype(np.float32)
            s = np.frombuffer(v[t["olcek_ofset"]:t["olcek_ofset"] + 4 * t["sekil"][0]], np.float32)
            W[t["ad"]] = q * s[:, None]
    return h["config"], W

def gelu(x): return 0.5 * x * (1 + np.tanh(np.sqrt(2 / np.pi) * (x + 0.044715 * x ** 3)))

def ln(x, g, b):
    mu = x.mean(-1, keepdims=True); sd = np.sqrt(((x - mu) ** 2).mean(-1, keepdims=True) + 1e-5)
    return (x - mu) / sd * g + b, np.concatenate([mu, sd], -1)

def ileri(cfg, W, ids, T):
    C, H = cfg["n_embd"], cfg["n_head"]; A = C // H; n = len(ids); out = {}
    x = np.zeros((T, C), np.float32); x[:n] = W["wte"][ids] + W["wpe"][:n]; out["x0"] = x.copy()
    for i in range(cfg["n_layer"]):
        p = f"h{i}."
        y, out[p + "ln1agg"] = ln(x, W[p + "ln_1.g"], W[p + "ln_1.b"]); out[p + "ln1"] = y
        qkv = y @ W[p + "attn.w"].T + W[p + "attn.b"]; out[p + "qkv"] = qkv
        att = np.zeros((H, T, T), np.float32); sm = np.zeros_like(att); agg = np.zeros((H, T, 2), np.float32); v_out = np.zeros((T, C), np.float32)
        for h in range(H):
            q, k, v = qkv[:, h * A:(h + 1) * A], qkv[:, C + h * A:C + (h + 1) * A], qkv[:, 2 * C + h * A:2 * C + (h + 1) * A]
            for t in range(T):
                d = (q[t] @ k[:t + 1].T) / np.sqrt(A); mx = d.max(); e = np.exp(d - mx); s = e.sum()
                att[h, t, :t + 1] = d; sm[h, t, :t + 1] = e / s; agg[h, t] = [1 / s, mx]
                v_out[t, h * A:(h + 1) * A] = sm[h, t, :t + 1] @ v[:t + 1]
        out[p + "att"], out[p + "attsm"], out[p + "attagg"], out[p + "vout"] = att, sm, agg, v_out
        pr = v_out @ W[p + "proj.w"].T + W[p + "proj.b"]; out[p + "proj"] = pr
        x = x + pr; out[p + "res1"] = x.copy()
        y, out[p + "ln2agg"] = ln(x, W[p + "ln_2.g"], W[p + "ln_2.b"]); out[p + "ln2"] = y
        f = y @ W[p + "fc.w"].T + W[p + "fc.b"]; out[p + "fc"] = f
        g = gelu(f); out[p + "gelu"] = g
        mp = g @ W[p + "mproj.w"].T + W[p + "mproj.b"]; out[p + "mproj"] = mp
        x = x + mp; out[p + "res2"] = x.copy()
    y, out["lnfagg"] = ln(x, W["ln_f.g"], W["ln_f.b"]); out["lnf"] = y
    lg = y @ W["wte"].T; out["logits"] = lg
    return out

if __name__ == "__main__":
    from tokenizers import Tokenizer
    import glob, os
    tok = Tokenizer.from_file("public/tokenizer/tokenizer.json")
    metin, T = sys.argv[1], int(sys.argv[2])
    ids = tok.encode(metin).ids
    cfg, W = yukle("cikti/gpt2-tr-3b.bin")
    o = ileri(cfg, W, ids, T)
    n = len(ids); lg = o["logits"][n - 1]; p = np.exp(lg - lg.max()); p /= p.sum()
    print("token:", ids, [tok.decode([i]) for i in ids])
    print("8 bit ilk 5:", [(tok.decode([i]), round(float(p[i]), 3)) for i in p.argsort()[::-1][:5]])
    np.savez("/tmp/claude-0/sp/ref3b.npz", ids=np.array(ids), **o)
    if len(sys.argv) > 3:
        import torch
        from transformers import GPT2LMHeadModel
        m = GPT2LMHeadModel.from_pretrained(cfg["kaynak"]).eval()
        with torch.no_grad(): l2 = m(torch.tensor([ids])).logits[0, -1].numpy()
        p2 = np.exp(l2 - l2.max()); p2 /= p2.sum()
        print("fp32 ilk 5:", [(tok.decode([i]), round(float(p2[i]), 3)) for i in p2.argsort()[::-1][:5]], "· logit farkı maks", float(np.abs(l2 - lg).max()))
