'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type Currency = 'USD' | 'XOF' | 'EUR' | 'GBP';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>('USD');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Load from localStorage
    const stored = localStorage.getItem('keza:currency') as Currency | null;
    if (stored && ['USD', 'XOF', 'EUR', 'GBP'].includes(stored)) {
      setCurrencyState(stored);
    }
    setMounted(true);
  }, []);

  const setCurrency = (currency: Currency) => {
    setCurrencyState(currency);
    localStorage.setItem('keza:currency', currency);
  };

  if (!mounted) return children;

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within CurrencyProvider');
  }
  return context;
}
