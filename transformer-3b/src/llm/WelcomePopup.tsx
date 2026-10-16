'use client';

import React from 'react';
import { faCircleQuestion } from '@fortawesome/free-regular-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { createContext, useContext, useEffect } from 'react';
import { assignImm } from '@/src/utils/data';
import { KeyboardOrder, useGlobalKeyboard } from '@/src/utils/keyboard';
import { useLocalStorageState } from '@/src/utils/localstorage';
import { ModalWindow } from '@/src/utils/Portal';
import s from './WelcomePopup.module.scss';
import { TocDiagram } from './components/TocDiagram';
import { Subscriptions, useSubscriptions } from '../utils/hooks';

interface IWelcomePopupLS {
    visible: boolean;
}

function hydrateWelcomePopupLS(a?: Partial<IWelcomePopupLS>) {
    return {
        visible: a?.visible ?? true,
    };
}

export const WelcomePopup: React.FC<{}> = () => {
    let ctx = useContext(WelcomeContext);
    useSubscriptions(ctx.subscriptions);
    let [welcomeState, setWelcomeState] = useLocalStorageState('welcome-popup', hydrateWelcomePopupLS);

    useGlobalKeyboard(KeyboardOrder.Modal, ev => {

        if (ev.key === 'Escape') {
            hide();
        }

        ev.stopPropagation();
    });

    useEffect(() => {
        if (ctx.forceVisible) {
            ctx.forceVisible = false;
            setWelcomeState(a => assignImm(a, { visible: true }));
        }
    }, [ctx, setWelcomeState, ctx.forceVisible]);

    function hide() {
        setWelcomeState(a => assignImm(a, { visible: false }));
    }

    if (!welcomeState.visible) {
        return null;
    }

    return <ModalWindow className={s.modalWindow} backdropClassName={s.modalWindowBackdrop} onBackdropClick={hide}>
        <div className={s.header}>
            <div className={s.title}>Hoş geldiniz!</div>
        </div>
        <div className={s.body}>
            {/* <div className={s.image}>
                <Image src={IntroImage} alt={"LLM diagram"} />
            </div> */}
            <div style={{ width: 600, flex: '0 0 auto' }}>
                <TocDiagram activePhase={null} onEnterPhase={hide} />
            </div>
            <div className={s.text}>
                <p>Bu sayfa, ChatGPT gibi sohbet uygulamalarının arkasındaki büyük dil modellerinin (LLM)
                    etkileşimli bir 3B görselleştirmesi.</p>
                <p>Burada aynı tasarımda ama çok daha küçük bir model çalışıyor: YTÜ Cosmos'un Türkçe GPT-2'si
                    (124 milyon parametre). Ağırlıklar bir kez iner, hesap tarayıcınızda yapılır.</p>
                <p>Soldaki anlatım modeli adım adım gezdirir: her toplama, çarpma ve işlemin ne yaptığını
                    gösterir. Sağdaki sahnede yakınlaşıp uzaklaşabilir, hücrelerin üzerine gelip değerlerin
                    nereden geldiğini görebilirsiniz.</p>
                <p className="text-sm text-gray-500">Brendan Bycroft'un <a className="underline" href="https://bbycroft.net/llm" target="_blank" rel="noopener noreferrer">LLM Visualization</a> projesinin
                    (MIT lisansı) İstem Mühendisliği dersi için Türkçe uyarlaması.</p>
            </div>
        </div>
        <div className={s.footer}>
            <button className={s.button} onClick={hide}>Başlayalım</button>
        </div>
    </ModalWindow>;
};

class WelcomeManager {
    subscriptions = new Subscriptions();
    forceVisible = false;
    showWelcomeDialog() {
        this.forceVisible = true;
        this.subscriptions.notify();
    }
}

let WelcomeContext = createContext(new WelcomeManager());

export const InfoButton: React.FC<{}> = () => {
    let ctx = useContext(WelcomeContext);

    return <div onClick={() => ctx.showWelcomeDialog()} className={s.infoBtn}>
        <FontAwesomeIcon icon={faCircleQuestion} />
    </div>;
};
