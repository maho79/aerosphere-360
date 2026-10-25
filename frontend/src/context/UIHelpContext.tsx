import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface UIHelpContextType {
  isHelpActive: boolean;
  toggleHelp: () => void;
  openHelp: () => void;
  closeHelp: () => void;
}

const UIHelpContext = createContext<UIHelpContextType | undefined>(undefined);

export const UIHelpProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isHelpActive, setIsHelpActive] = useState(false);

  const toggleHelp = useCallback(() => {
    setIsHelpActive((prev) => !prev);
  }, []);

  const openHelp = useCallback(() => setIsHelpActive(true), []);
  const closeHelp = useCallback(() => setIsHelpActive(false), []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isHelpActive) {
        closeHelp();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isHelpActive, closeHelp]);

  return (
    <UIHelpContext.Provider value={{ isHelpActive, toggleHelp, openHelp, closeHelp }}>
      {children}
    </UIHelpContext.Provider>
  );
};

export const useUIHelp = () => {
  const context = useContext(UIHelpContext);
  if (!context) {
    throw new Error('useUIHelp must be used within a UIHelpProvider');
  }
  return context;
};
