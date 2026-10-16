import React from 'react';
import { Ust } from '@/src/llm/tr/Ust';
import { HikayeSayfa } from '@/src/hikaye/HikayeSayfa';
import { L } from '@/src/llm/tr/dil';

export const metadata = {
    title: L('Transformer Gezgini 3B · Ayrıntılı', 'Transformer Explorer 3D · Detailed'),
    description: L('Türkçe GPT-2 bloğunun içindeki matris işlemleri (Q, K, V, dikkat, MLP, çıktı) gerçek sayılarla, sinematik 3B.', 'The matrix operations inside a GPT-2 block (Q, K, V, attention, MLP, output) with real numbers, in cinematic 3D.'),
};

export default function Page() {
    return <>
        <Ust gorunum="ayrinti" />
        <HikayeSayfa mod="ayrinti" />
    </>;
}
