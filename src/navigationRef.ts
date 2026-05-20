import { createNavigationContainerRef, CommonActions } from '@react-navigation/native';
import type { RootStackParamList } from '../App';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/**
 * Reset navigasi ke halaman Login dari mana saja (termasuk dari dalam Tab Navigator).
 * Ini adalah cara paling andal karena menggunakan ref langsung ke NavigationContainer.
 */
export function resetToLogin() {
  if (navigationRef.isReady()) {
    navigationRef.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      })
    );
  }
}
