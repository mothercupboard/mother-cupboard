import { useWindowDimensions } from 'react-native';

/** Breakpoint at which we consider the device a tablet (iPad). */
const TABLET_BREAKPOINT = 768;

/**
 * Returns true when the screen width is at or above 768px.
 * Re-evaluates on rotation so layouts stay correct in both orientations.
 */
export function useIsTablet(): boolean {
  const { width } = useWindowDimensions();
  return width >= TABLET_BREAKPOINT;
}
