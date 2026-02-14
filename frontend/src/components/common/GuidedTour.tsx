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
                    overlayColor: 'rgba(0, 0, 0, 0.5)',
                    primaryColor: '#c5a059', // UIDE Gold
                    textColor: '#0f172a',
                    zIndex: 1000,
                },
                tooltipContainer: {
                    textAlign: 'left',
                    borderRadius: '16px',
                    padding: '8px',
                },
                buttonNext: {
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '900',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    padding: '12px 20px',
                },
                buttonBack: {
                    fontSize: '12px',
                    fontWeight: '700',
                    marginRight: '12px',
                    color: '#64748b',
                },
                buttonSkip: {
                    fontSize: '12px',
                    fontWeight: '700',
                    color: '#ef4444',
                },
            }}
        />
    );
};

export default GuidedTour;
