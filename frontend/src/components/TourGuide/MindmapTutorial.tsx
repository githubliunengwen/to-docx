import React from 'react';
import { Step } from 'react-joyride';
import BaseTutorial from './BaseTutorial';

const MindmapTutorial: React.FC = () => {
  const steps: Step[] = [
    {
      target: '.mindmap-textarea',
      content: '在这里粘贴【豆包】输出的 Markdown 格式的文本内容。点击生成思维导图按钮',
      title: '文本编辑区',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '.btn-clear',
      content: '点击此按钮可以清空当前输入的所有内容。',
      title: '清空内容',
      placement: 'top',
    },
    {
      target: '.btn-generate-mindmap',
      content: '输入内容后，点击此按钮生成思维导图文件。文件将保存为 Markdown 格式。',
      title: '生成思维导图',
      placement: 'top',
    },
    {
      target: '.mindmap-actions .btn-action',
      content: '生成成功后，查看您生成的思维导图文件。使用您的【亿图】导入',
      title: '查看文件',
      placement: 'top',
    },
  ];

  return (
    <BaseTutorial
      tutorialType="mindmap"
      steps={steps}
      title="思维导图生成指南"
    />
  );
};

export default MindmapTutorial;
