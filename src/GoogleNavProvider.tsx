import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import NativeGoogleNavModule from './NativeGoogleNavModule';
import { NavigationState } from './types';

interface GoogleNavContextValue {
  isInitialized: boolean;
  termsAccepted: boolean;
  navigationState: NavigationState;
  setNavigationState: (state: NavigationState) => void;
  initializeNavigation: (apiKey: string) => Promise<boolean>;
  showTermsAndConditions: (
    title: string,
    companyName: string
  ) => Promise<boolean>;
}

const GoogleNavContext = createContext<GoogleNavContextValue | null>(null);

export interface GoogleNavProviderProps {
  children: ReactNode;
  apiKey: string;
}

export function GoogleNavProvider({ children, apiKey }: GoogleNavProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [navigationState, setNavigationState] = useState<NavigationState>(
    NavigationState.IDLE
  );

  useEffect(() => {
    console.log('[GoogleNavProvider] Initializing with API key...');
    NativeGoogleNavModule.initializeNavigation(apiKey)
      .then((result) => {
        console.log('[GoogleNavProvider] initializeNavigation result:', result);
        setIsInitialized(result);
        if (result) {
          // Auto-show terms & conditions — required before navigation works
          return NativeGoogleNavModule.showTermsAndConditions(
            'Navigation',
            'App'
          );
        }
        return false;
      })
      .then((accepted) => {
        console.log('[GoogleNavProvider] Terms accepted:', accepted);
        if (accepted) {
          setTermsAccepted(true);
        }
      })
      .catch((error) => {
        console.error('[GoogleNavProvider] Init error:', error);
        setIsInitialized(false);
      });
  }, [apiKey]);

  const initializeNavigation = useCallback(async (key: string) => {
    const result = await NativeGoogleNavModule.initializeNavigation(key);
    setIsInitialized(result);
    return result;
  }, []);

  const showTermsAndConditions = useCallback(
    async (title: string, companyName: string) => {
      const result = await NativeGoogleNavModule.showTermsAndConditions(
        title,
        companyName
      );
      setTermsAccepted(result);
      return result;
    },
    []
  );

  return (
    <GoogleNavContext.Provider
      value={{
        isInitialized,
        termsAccepted,
        navigationState,
        setNavigationState,
        initializeNavigation,
        showTermsAndConditions,
      }}
    >
      {children}
    </GoogleNavContext.Provider>
  );
}

export function useGoogleNav() {
  const context = useContext(GoogleNavContext);
  if (!context) {
    throw new Error('useGoogleNav must be used within a GoogleNavProvider');
  }
  return context;
}
