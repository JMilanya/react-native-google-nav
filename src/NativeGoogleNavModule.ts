import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  initializeNavigation(apiKey: string): Promise<boolean>;
  showTermsAndConditions(
    title: string,
    companyName: string
  ): Promise<boolean>;
  areTermsAccepted(): Promise<boolean>;
  resetTermsAccepted(): void;
  isGuidanceRunning(): Promise<boolean>;
  getSDKVersion(): Promise<string>;

  // Background location — required by NativeEventEmitter
  addListener(eventName: string): void;
  removeListeners(count: number): void;

  startBackgroundLocationUpdates(
    intervalMs: number,
    notificationTitle: string,
    notificationText: string
  ): Promise<boolean>;
  stopBackgroundLocationUpdates(): Promise<boolean>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('GoogleNavModule');
