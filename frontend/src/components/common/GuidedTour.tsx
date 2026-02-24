import React from 'react';
import Joyride, { Step, CallBackProps, STATUS } from 'react-joyride';

interface GuidedTourProps {
    steps: Step[];
    run: boolean;
    onFinish?: () => void;
}

const GuidedTour: React.FC<GuidedTourProps> = ({ steps, run, onFinish }) => {
    const handleJoyrideCallback = (data: CallBackProps) => {
        const { status } = data;
        const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

        if (finishedStatuses.includes(status)) {
            if (onFinish) onFinish();
        }
    };

    return (
        <Joyride
            steps={steps}
            run={run}
            continuous
            scrollToFirstStep
            showProgress
            showSkipButton
            disableScrolling={false}
            disableScrollParentFix={false}
            spotlightPadding={5}
            callback={handleJoyrideCallback}
            locale={{
                back: 'Anterior',
                close: 'Cerrar',
                last: 'Finalizar',
                next: 'Siguiente',
                skip: 'Omitir',
            }}
            styles={{
                options: {
                    arrowColor: '#fff',
                    backgroundColor: '#fff',
                    overlayColor: 'rgba(0, 0, 0, 0.8)',
                    primaryColor: '#00529b',
                    textColor: '#1e293b',
                    zIndex: 10000,
                    width: window.innerWidth < 480 ? window.innerWidth - 40 : 360,
                },
                tooltip: {
                    borderRadius: '24px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
                    padding: '0',
                    overflow: 'hidden',
                },
                tooltipContainer: {
                    textAlign: 'left',
                },
                tooltipContent: {
                    padding: '15px 20px',
                    fontSize: '14px',
                    lineHeight: '1.5',
                    fontWeight: '500',
                },
                buttonNext: {
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: '800',
                    padding: '10px 18px',
                    backgroundColor: '#00529b',
                    outline: 'none',
                },
                buttonBack: {
                    fontSize: '11px',
                    fontWeight: '700',
                    outline: 'none',
                },
                buttonSkip: {
                    fontSize: '11px',
                    fontWeight: '700',
                    outline: 'none',
                },
                spotlight: {
                    borderRadius: '18px',
                }
            }}
            tooltipComponent={({ step, tooltipProps, primaryProps, backProps, skipProps, isLastStep, index, size }) => (
                <div {...tooltipProps} className="bg-white rounded-[24px] overflow-hidden shadow-2xl">
                    <div className="relative h-28 bg-gradient-to-br from-primary/5 to-transparent flex items-center justify-center p-3 border-b border-border/40">
                        <img
                            src="/image_guia.png"
                            alt="Mascota UIDE"
                            className="h-full w-auto object-contain drop-shadow-lg animate-bounce-subtle"
                        />
                        <button {...skipProps} className="absolute top-3 right-3 p-1 text-muted-foreground hover:text-foreground transition-colors outline-none">
                            <span className="material-symbols-outlined text-lg">close</span>
                        </button>
                    </div>
                    <div className="p-5 md:p-6">
                        <div className="mb-4">
                            <h4 className="text-[9px] font-black uppercase text-primary tracking-[0.2em] mb-1.5 flex items-center gap-2">
                                <span className="size-1.5 bg-primary rounded-full"></span>
                                Paso {index + 1} de {size}
                            </h4>
                            <p className="text-slate-700 text-[14px] leading-relaxed font-semibold">
                                {step.content}
                            </p>
                        </div>
                        <div className="flex items-center justify-between border-t border-border/30 pt-4">
                            <button {...skipProps} className="text-[10px] font-black uppercase text-slate-400 hover:text-slate-600 transition-colors tracking-widest outline-none">
                                Omitir
                            </button>
                            <div className="flex gap-2">
                                {index > 0 && (
                                    <button {...backProps} className="text-[10px] font-black uppercase text-slate-500 hover:text-slate-800 transition-colors tracking-widest px-3 py-2 outline-none">
                                        Anterior
                                    </button>
                                )}
                                <button {...primaryProps} className="bg-primary text-white text-[10px] font-black uppercase tracking-[0.1em] px-5 py-2.5 rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/10 flex items-center gap-1.5 active:scale-95 outline-none">
                                    {isLastStep ? 'Finalizar' : 'Siguiente'}
                                    <span className="material-symbols-outlined text-xs">arrow_forward</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            floaterProps={{
                disableAnimation: false,
                styles: {
                    arrow: {
                        display: 'none',
                    },
                    container: {
                        borderRadius: '24px',
                        overflow: 'hidden'
                    },
                },
            }}
        />
    );
};

export default GuidedTour;
