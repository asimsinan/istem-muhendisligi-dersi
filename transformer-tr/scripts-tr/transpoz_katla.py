"""Orta model için: do_constant_folding=False ile dışa aktarılan modelde ağırlıklar Transpose düğümünden
geçiyor; nicemleme ancak MatMul'a doğrudan ağırlık girerse çalışır. Ağırlık üzerindeki Transpose'ları
önceden hesaplayıp (sabit katlama) yerine yazar. Kullanım: python scripts-tr/transpoz_katla.py gpt2-tr-orta"""
import sys, onnx, numpy as np
from onnx import numpy_helper
P = "src/utils/model/params_output/"; ad = sys.argv[1]
m = onnx.load(P + ad + ".onnx")
inits = {i.name: i for i in m.graph.initializer}
kullanim = {}
for n in m.graph.node:
    for x in n.input: kullanim[x] = kullanim.get(x, 0) + 1
silinecek = []
for n in m.graph.node:
    if n.op_type == "Transpose" and n.input[0] in inits:
        perm = next((list(a.ints) for a in n.attribute if a.name == "perm"), None)
        dizi = numpy_helper.to_array(inits[n.input[0]])
        yeni = np.ascontiguousarray(np.transpose(dizi, perm))
        m.graph.initializer.append(numpy_helper.from_array(yeni, n.output[0]))
        silinecek.append(n)
for n in silinecek: m.graph.node.remove(n)
# artık kullanılmayan eski ağırlıkları kaldır
kullanim = {}
for n in m.graph.node:
    for x in n.input: kullanim[x] = 1
ciktilar = {o.name for o in m.graph.output}
kalan = [i for i in m.graph.initializer if i.name in kullanim or i.name in ciktilar]
del m.graph.initializer[:]; m.graph.initializer.extend(kalan)
onnx.save(m, P + ad + "-katli.onnx")
print("katlanan Transpose:", len(silinecek))
