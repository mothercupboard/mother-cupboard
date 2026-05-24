import { Platform, useWindowDimensions } from 'react-native';

/** Breakpoint for non-Apple large screens (Android tablets etc). */
const TABLET_BREAKPOINT = 768;

/**
 * Returns true on iPad (via Platform.isPad) or any device with a screen
 * width at or above 768px. Re-evaluates on rotation.
 */
export function useIsTablet(): boolean {
  const { width } = useWindowDimensions();
  return Platform.isPad || width >= TABLET_BREAKPOINT;
}
