import React from 'react';
import { Ust } from '@/src/llm/tr/Ust';
import { HikayeSayfa } from '@/src/hikaye/HikayeSayfa';
import { L } from '@/src/llm/tr/dil';

export const metadata = {
    title: L('Transformer Gezgini 3B · Anlatım', 'Transformer Explorer 3D · Story'),
    description: L('Türkçe GPT-2 bir cümleyi nasıl okur ve sıradaki parçayı nasıl tahmin eder: adım adım sinematik 3B anlatım.', 'How GPT-2 reads a sentence and predicts the next token: a step-by-step cinematic 3D story.'),
};

export default function Page() {
    return <>
        <Ust />
        <HikayeSayfa />
    </>;
}
