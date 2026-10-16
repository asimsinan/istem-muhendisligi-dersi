import React from 'react';
import { Phase } from "./Walkthrough";
import { commentary, embed, IWalkthroughArgs, setInitialCamera } from "./WalkthroughTools";
import s from './Walkthrough.module.scss';
import { Vec3 } from '@/src/utils/vector';

let minGptLink = 'https://github.com/karpathy/minGPT';
let llmVizLink = 'https://bbycroft.net/llm';
let pytorchLink = 'https://pytorch.org/';
let andrejLink = 'https://karpathy.ai/';
let zeroToHeroLink = 'https://karpathy.ai/zero-to-hero.html';

export function walkthrough01_Prelim(args: IWalkthroughArgs) {
    let { state, walkthrough: wt } = args;

    if (wt.phase !== Phase.Intro_Prelim) {
        return;
    }

    setInitialCamera(state, new Vec3(184.744, 0.000, -636.820), new Vec3(296.000, 16.000, 13.500));

    let c0 = commentary(wt, null, 0)`
Ayrıntılara girmeden önce bir adım geri çekilelim.

Bu rehber _çıkarım_ (inference) üzerine: modelin nasıl eğitildiğini değil, eğitilmiş bir modelin nasıl çalıştığını anlatıyor. Ağırlıklar önceden eğitildi ve artık sabit; biz bu ağırlıklarla çıktı üretiyoruz. Hesap doğrudan tarayıcınızda yapılıyor: yaklaşık 125 MB'lık ağırlık bir kez iniyor, sonra her tahmin bilgisayarınızda hesaplanıyor.

Buradaki model GPT (generative pre-trained transformer, "üretken, önceden eğitilmiş dönüştürücü") ailesinden; kısaca bağlama bakarak sıradaki parçayı tahmin eden bir model. OpenAI bu aileyi 2018'de tanıttı; GPT-2 2019'da yayımlandı. Türkçe GPT-2 aynı mimariyle, Türkçe metinler üzerinde sıfırdan eğitildi. Bugünkü sohbet modelleri de aynı temel fikre dayanıyor; ama yüzlerce kat büyükler, mimarilerinde bazı yenilikler var ve üstüne sohbet için ek eğitim alıyorlar.

Bu 3B görünüm, Brendan Bycroft'un ${embedLink('LLM Visualization', llmVizLink)} projesinin (MIT lisansı) Türkçe uyarlaması. Özgün anlatım, ${embedLink('minGPT', minGptLink)} projesindeki, A, B ve C harflerini sıralayan 85 bin parametrelik minicik bir model üzerineydi. Burada aynı adımları gerçek bir Türkçe dil modeliyle izliyoruz. Konuya iyi bir giriş için ${embedLink('Andrej Karpathy', andrejLink)}'nin ${embedLink("Neural Networks: Zero to Hero", zeroToHeroLink)} video dizisine bakabilirsiniz.

Hadi başlayalım!
`;

}

export function embedLink(a: React.ReactNode, href: string) {
    return embedInline(<a className={s.externalLink} href={href} target="_blank" rel="noopener noreferrer">{a}</a>);
}

export function embedInline(a: React.ReactNode) {
    return { insertInline: a };
}


// Another similar model is BERT (bidirectional encoder representations from transformers), a "context-aware text encoder" commonly
// used for tasks like document classification and search.  Newer models like Facebook's LLaMA (large language model architecture), continue to use
// a similar transformer architecture, albeit with some minor differences.
