import React from 'react';
import { Step } from 'react-joyride';
import BaseTutorial from './BaseTutorial';

const ConvertTutorial: React.FC = () => {
  const steps: Step[] = [
    {
      target: '.file-selection-area',
      content: '点击这里选择要转换的文件。支持 EPUB、MP3、WAV、M4A、AAC、MP4、AVI、MOV 等格式。',
      title: '选择文件',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '.btn-select-large',
      content: '点击此按钮打开文件选择对话框，选择您要转换的文件。',
      title: '选择文件按钮',
      placement: 'top',
    },
    {
      target: '.premium-sidebar',
      content: '左侧导航栏可以切换不同功能：格式转换、生成思维导图、设置等。',
      title: '功能导航',
      placement: 'right',
    },
  ];

  return (
    <BaseTutorial
      tutorialType="convert"
      steps={steps}
      title="格式转换指南"
    />
  );
};

export default ConvertTutorial;
