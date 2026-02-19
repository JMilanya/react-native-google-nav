import { type ReactNode } from 'react';
import { NavigationState } from './types';
interface GoogleNavContextValue {
    isInitialized: boolean;
    termsAccepted: boolean;
    navigationState: NavigationState;
    setNavigationState: (state: NavigationState) => void;
    initializeNavigation: (apiKey: string) => Promise<boolean>;
    showTermsAndConditions: (title: string, companyName: string) => Promise<boolean>;
}
export interface GoogleNavProviderProps {
    children: ReactNode;
    apiKey: string;
}
export declare function GoogleNavProvider({ children, apiKey }: GoogleNavProviderProps): import("react/jsx-runtime").JSX.Element;
export declare function useGoogleNav(): GoogleNavContextValue;
export {};
//# sourceMappingURL=GoogleNavProvider.d.ts.map