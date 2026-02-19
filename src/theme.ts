import type { NavigationTheme } from './types';

export const DefaultNavigationTheme: NavigationTheme = {
  headerBackgroundColor: '#4285F4',
  headerSecondaryBackgroundColor: '#3367D6',
  headerTextColor: '#FFFFFF',
  headerManeuverIconColor: '#FFFFFF',
};

export const DarkNavigationTheme: NavigationTheme = {
  headerBackgroundColor: '#1A1A2E',
  headerSecondaryBackgroundColor: '#16213E',
  headerTextColor: '#E0E0E0',
  headerManeuverIconColor: '#E0E0E0',
};

export function createNavigationTheme(
  overrides: Partial<NavigationTheme>
): NavigationTheme {
  return {
    ...DefaultNavigationTheme,
    ...overrides,
  };
}
