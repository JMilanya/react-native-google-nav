"use strict";

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import NativeGoogleNavModule from "./NativeGoogleNavModule.js";
import { NavigationState } from "./types.js";
import { jsx as _jsx } from "react/jsx-runtime";
const GoogleNavContext = /*#__PURE__*/createContext(null);
export function GoogleNavProvider({
  children,
  apiKey
}) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [navigationState, setNavigationState] = useState(NavigationState.IDLE);
  useEffect(() => {
    console.log('[GoogleNavProvider] Initializing with API key...');
    NativeGoogleNavModule.initializeNavigation(apiKey).then(result => {
      console.log('[GoogleNavProvider] initializeNavigation result:', result);
      setIsInitialized(result);
      if (result) {
        // Auto-show terms & conditions — required before navigation works
        return NativeGoogleNavModule.showTermsAndConditions('Navigation', 'App');
      }
      return false;
    }).then(accepted => {
      console.log('[GoogleNavProvider] Terms accepted:', accepted);
      if (accepted) {
        setTermsAccepted(true);
      }
    }).catch(error => {
      console.error('[GoogleNavProvider] Init error:', error);
      setIsInitialized(false);
    });
  }, [apiKey]);
  const initializeNavigation = useCallback(async key => {
    const result = await NativeGoogleNavModule.initializeNavigation(key);
    setIsInitialized(result);
    return result;
  }, []);
  const showTermsAndConditions = useCallback(async (title, companyName) => {
    const result = await NativeGoogleNavModule.showTermsAndConditions(title, companyName);
    setTermsAccepted(result);
    return result;
  }, []);
  return /*#__PURE__*/_jsx(GoogleNavContext.Provider, {
    value: {
      isInitialized,
      termsAccepted,
      navigationState,
      setNavigationState,
      initializeNavigation,
      showTermsAndConditions
    },
    children: children
  });
}
export function useGoogleNav() {
  const context = useContext(GoogleNavContext);
  if (!context) {
    throw new Error('useGoogleNav must be used within a GoogleNavProvider');
  }
  return context;
}
//# sourceMappingURL=GoogleNavProvider.js.map