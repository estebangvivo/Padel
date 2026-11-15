import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AccountForm } from '../components/AccountForm';
import { createAccount, parseAccount, type PlayerAccount } from '../lib/account';
import type { Category } from '../lib/category';

const STORAGE_KEY = 'contador-padel:account:v1';

interface AccountContextValue {
  ready: boolean;
  account: PlayerAccount | null;
  saveAccount: (name: string, phone: string, category: Category, floor?: Category) => void;
  openAccount: () => void;
}

const AccountContext = createContext<AccountContextValue | null>(null);

export function AccountProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [account, setAccount] = useState<PlayerAccount | null>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!active) return;
        setAccount(parseAccount(raw));
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const saveAccount = useCallback((name: string, phone: string, category: Category, floor?: Category) => {
    setAccount((current) => {
      const next = createAccount(name, phone, category, current, floor);
      void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    setEditing(false);
  }, []);

  const value = useMemo<AccountContextValue>(
    () => ({ ready, account, saveAccount, openAccount: () => setEditing(true) }),
    [ready, account, saveAccount],
  );

  return (
    <AccountContext.Provider value={value}>
      {children}
      <AccountForm
        visible={ready && (account == null || editing)}
        account={account}
        canClose={account != null}
        onSave={saveAccount}
        onClose={() => setEditing(false)}
      />
    </AccountContext.Provider>
  );
}

export function useAccount(): AccountContextValue {
  const value = useContext(AccountContext);
  if (!value) throw new Error('useAccount must be used within AccountProvider');
  return value;
}
