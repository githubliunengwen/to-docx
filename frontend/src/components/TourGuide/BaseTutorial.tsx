import React from 'react';
import Joyride, { CallBackProps, STATUS, ACTIONS, Step } from 'react-joyride';
import { useTutorial } from './TutorialManager';

interface BaseTutorialProps {
  tutorialType: string;
  steps: Step[];
  title?: string;
}

const BaseTutorial: React.FC<BaseTutorialProps> = ({
  tutorialType,
  steps,
  title = '操作指南'
}) => {
  const { activeTutorial, closeTutorial } = useTutorial();
  const isOpen = activeTutorial === tutorialType;

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, action } = data;
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED || action === ACTIONS.CLOSE) {
      closeTutorial();
    }
  };

  return (
    <Joyride
      steps={steps}
      run={isOpen}
      continuous
      showProgress={false}
      showSkipButton
      disableOverlayClose
      disableCloseOnEsc
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: '#228be6',
          backgroundColor: '#ffffff',
          textColor: '#495057',
          overlayColor: 'rgba(0, 0, 0, 0.4)',
          arrowColor: '#ffffff',
          zIndex: 10000,
        },
        tooltip: {
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          color: '#495057',
        },
        tooltipTitle: {
          color: '#212529',
          fontSize: '16px',
          fontWeight: 600,
        },
        tooltipContent: {
          fontSize: '14px',
          lineHeight: '1.5',
          padding: '8px 0',
        },
        buttonNext: {
          backgroundColor: '#228be6',
          borderRadius: '6px',
          color: '#ffffff',
          fontSize: '14px',
          fontWeight: 500,
          padding: '8px 16px',
        },
        buttonBack: {
          color: '#495057',
          fontSize: '14px',
          marginRight: '8px',
        },
        buttonSkip: {
          color: '#6c757d',
          fontSize: '14px',
        },
        buttonClose: {
          color: '#495057',
          fontSize: '18px',
          fontWeight: 'bold',
          padding: '4px',
        },
        beacon: {
          backgroundColor: '#228be6',
        },
        beaconInner: {
          backgroundColor: '#228be6',
        },
        spotlight: {
          borderRadius: '8px',
        },
      }}
      locale={{
        back: '上一步',
        close: '关闭',
        last: '完成',
        next: '下一步',
        skip: '跳过',
      }}
    />
  );
};

export default BaseTutorial;
