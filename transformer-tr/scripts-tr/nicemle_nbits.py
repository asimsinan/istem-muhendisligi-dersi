"""Yalnız-ağırlık nicemleme (MatMulNBits): XGLM için. Dinamik int8 (nicemle.py) etkinleştirmeleri de
nicemlediği için XGLM'de tahminleri bozuyordu (ör. "Ankara" %29 → %8). Burada etkinleştirmeler fp32 kalır.
Kullanım: python scripts-tr/nicemle_nbits.py gpt2-tr-xglm 8  ·  python scripts-tr/nicemle_nbits.py gpt2-tr-gemma 8   (bit: 4 ya da 8; blok 32)"""
import sys, onnx, numpy as np
from onnx import numpy_helper, helper, TensorProto
from onnxruntime.quantization.matmul_nbits_quantizer import MatMulNBitsQuantizer
P = "src/utils/model/params_output/"
ad, bit = sys.argv[1], int(sys.argv[2])
m = onnx.load(P + ad + ".onnx")
q = MatMulNBitsQuantizer(m, bits=bit, block_size=32, is_symmetric=True)
q.process()
m = q.model.model
# Gömme tablosu: Gather'a giren 2 boyutlu ağırlık (GPT-2: model.transformer.wte.weight, Gemma: model.embed_tokens.weight)
ilkler = {i.name: i for i in m.graph.initializer}
W = next(n.input[0] for n in m.graph.node if n.op_type == "Gather" and n.input[0] in ilkler and len(ilkler[n.input[0]].dims) == 2)
print("gömme:", W)
for i, init in enumerate(m.graph.initializer):
    if init.name == W:
        m.graph.initializer[i].CopyFrom(numpy_helper.from_array(numpy_helper.to_array(init).astype(np.float16), W))
g = [n for n in m.graph.node if n.op_type == "Gather" and W in n.input][0]
eski = g.output[0]; g.output[0] = eski + "_f16"
m.graph.node.insert(list(m.graph.node).index(g) + 1, helper.make_node("Cast", [eski + "_f16"], [eski], to=TensorProto.FLOAT, name="/model/wte/Cast_f32"))
kalan = [vi for vi in m.graph.value_info if not vi.name.startswith(eski)]
del m.graph.value_info[:]; m.graph.value_info.extend(kalan)
son = P + f"{ad}-n{bit}.onnx"
onnx.save(m, son); print("✔", son)
