import React, { createContext, useContext, useState, ReactNode } from 'react';

export type TutorialType = 'convert' | 'mindmap' | 'settings' | 'result' | 'markdown' | null;

interface TutorialContextType {
  activeTutorial: TutorialType;
  startTutorial: (type: TutorialType) => void;
  closeTutorial: () => void;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

export const useTutorial = () => {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
};

interface TutorialProviderProps {
  children: ReactNode;
}

export const TutorialProvider: React.FC<TutorialProviderProps> = ({ children }) => {
  const [activeTutorial, setActiveTutorial] = useState<TutorialType>(null);

  const startTutorial = (type: TutorialType) => {
    // 关闭当前教程，启动新教程
    setActiveTutorial(type);
  };

  const closeTutorial = () => {
    setActiveTutorial(null);
  };

  return (
    <TutorialContext.Provider value={{ activeTutorial, startTutorial, closeTutorial }}>
      {children}
    </TutorialContext.Provider>
  );
};
