import React from 'react';
import { Step } from 'react-joyride';
import BaseTutorial from './BaseTutorial';

const ConvertResultTutorial: React.FC = () => {
  const steps: Step[] = [
    {
      target: '.result-card',
      content: '恭喜您！文件转换成功啦。接下来您可以去【豆包】提炼文档啦。',
      title: '转换成功',
      placement: 'top',
      disableBeacon: true,
    },
    {
      target: '.result-path',
      content: '这里显示了转换后文件的完整保存路径，您可以复制此路径。',
      title: '文件路径',
      placement: 'bottom',
    },
    {
      target: '.btn-action:first-child',
      content: '点击此按钮可以直接打开转换后的 Word 文档进行查看和编辑。',
      title: '打开文件',
      placement: 'top',
    },
    {
      target: '.btn-action:last-child',
      content: '显示转换后的文件，您可以拿文件去【豆包】提炼内容啦。',
      title: '在文件夹中显示',
      placement: 'top',
    },
    {
      target: '.btn-reselect',
      content: '如果需要转换其他文件，可以点击此按钮重新选择文件。',
      title: '重新选择文件',
      placement: 'bottom',
    },
  ];

  return (
    <BaseTutorial
      tutorialType="result"
      steps={steps}
      title="转换完成指南"
    />
  );
};

export default ConvertResultTutorial;
