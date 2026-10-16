"""fp32 ONNX → tarayıcı için küçültülmüş model (210 MB).
Blok ve çıktı (lm_head) MatMul ağırlıkları kanal başına int8 (dinamik); token gömme tablosu fp16 + Cast.
Not: Gömme tablosunu int8'e çevirmek ya da dikkat MatMul'larını nicemlemek çıktıyı bozuyor (denendi)."""
import sys, onnx, numpy as np
from onnx import numpy_helper, helper, TensorProto
from onnxruntime.quantization import quantize_dynamic, QuantType
P = "src/utils/model/params_output/"
ad = sys.argv[1] if len(sys.argv) > 1 else "gpt2-tr"  # orta model için: gpt2-tr-orta
src, ara, son = P + ad + ".onnx", P + ad + "-q8.onnx", P + ad + "-final.onnx"
m = onnx.load(src, load_external_data=False); inits = {i.name for i in m.graph.initializer}
dugumler = [n.name for n in m.graph.node if n.op_type == "MatMul" and any(x in inits for x in n.input)]
quantize_dynamic(src, ara, weight_type=QuantType.QInt8, nodes_to_quantize=dugumler, per_channel=True)
m = onnx.load(ara)
for i, init in enumerate(m.graph.initializer):
    if init.name == "model.transformer.wte.weight":
        m.graph.initializer[i].CopyFrom(numpy_helper.from_array(numpy_helper.to_array(init).astype(np.float16), init.name))
g = [n for n in m.graph.node if n.op_type == "Gather" and "model.transformer.wte.weight" in n.input][0]
eski = g.output[0]; g.output[0] = eski + "_f16"
m.graph.node.insert(list(m.graph.node).index(g) + 1, helper.make_node("Cast", [eski + "_f16"], [eski], to=TensorProto.FLOAT, name="/model/wte/Cast_f32"))
# Eski tür bilgisi (value_info) Gather çıktısını float16 sanabilir; kaldır, çalışma anında yeniden çıkarılır
kalan = [vi for vi in m.graph.value_info if not vi.name.startswith(eski)]
del m.graph.value_info[:]; m.graph.value_info.extend(kalan)
onnx.checker.check_model(m); onnx.save(m, son); print("✔", son)
