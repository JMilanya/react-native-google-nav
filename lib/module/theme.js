"use strict";

export const DefaultNavigationTheme = {
  headerBackgroundColor: '#4285F4',
  headerSecondaryBackgroundColor: '#3367D6',
  headerTextColor: '#FFFFFF',
  headerManeuverIconColor: '#FFFFFF'
};
export const DarkNavigationTheme = {
  headerBackgroundColor: '#1A1A2E',
  headerSecondaryBackgroundColor: '#16213E',
  headerTextColor: '#E0E0E0',
  headerManeuverIconColor: '#E0E0E0'
};
export function createNavigationTheme(overrides) {
  return {
    ...DefaultNavigationTheme,
    ...overrides
  };
}
//# sourceMappingURL=theme.js.map