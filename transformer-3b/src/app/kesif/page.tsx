import React from 'react';
import { Ust } from '@/src/llm/tr/Ust';
import { KesifSayfa } from '@/src/kesif/KesifSayfa';
import { L } from '@/src/llm/tr/dil';

export const metadata = {
    title: L('Transformer Gezgini 3B · Keşif', 'Transformer Explorer 3D · Explore'),
    description: L('Bir parçaya ya da bloğa tıklayın: dikkat, vektör ve tahmin gerçek sayılarla, serbest gezinme.', 'Click a token or a block: attention, vectors and predictions with real numbers, free exploration.'),
};

export default function Page() {
    return <>
        <Ust gorunum="kesif" />
        <KesifSayfa />
    </>;
}
