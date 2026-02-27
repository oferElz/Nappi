import React, { createContext, useContext, useState } from 'react';

interface LayoutContextType {
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
  toggleMenu: () => void;
  pageLoading: boolean;
  setPageLoading: (loading: boolean) => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export const LayoutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);

  const toggleMenu = () => setMenuOpen(prev => !prev);

  return (
    <LayoutContext.Provider value={{ menuOpen, setMenuOpen, toggleMenu, pageLoading, setPageLoading }}>
      {children}
    </LayoutContext.Provider>
  );
};

export const useLayoutContext = () => {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error('useLayoutContext must be used within LayoutProvider');
  }
  return context;
};