import React from 'react';
import { Step } from 'react-joyride';
import BaseTutorial from './BaseTutorial';

const SettingsTutorial: React.FC = () => {
  const steps: Step[] = [
    {
      target: '.setting-item:first-child',
      content: '软件激活管理：查看当前激活状态，或者输入激活码激活软件。',
      title: '软件激活',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '.setting-item:nth-child(2)',
      content: '配置 DOCX 文件的输出路径。转换后的 Word 文档将保存到此目录。',
      title: 'DOCX 输出路径',
      placement: 'bottom',
    },
    {
      target: '.setting-item:nth-child(3)',
      content: '配置 Markdown 文件的输出路径。生成的思维导图文件将保存到此目录。',
      title: 'Markdown 输出路径',
      placement: 'bottom',
    },
    {
      target: '.setting-item:nth-child(2) .btn-change-path',
      content: '点击"更改路径"按钮可以选择新的输出目录。',
      title: '更改路径',
      placement: 'left',
    },
    {
      target: '.path-display',
      content: '这里显示当前设置的输出路径。路径更改后会立即生效。',
      title: '当前路径',
      placement: 'top',
    },
  ];

  return (
    <BaseTutorial
      tutorialType="settings"
      steps={steps}
      title="设置页面指南"
    />
  );
};

export default SettingsTutorial;
