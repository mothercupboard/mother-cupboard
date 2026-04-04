/* eslint-disable react-refresh/only-export-components */
import type { RenderOptions } from '@testing-library/react-native';

import type { ReactElement } from 'react';
import { render, userEvent } from '@testing-library/react-native';
import * as React from 'react';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { WarmHearthTheme } from '@/components/common/paper-theme';

function createAppWrapper() {
  return ({ children }: { children: React.ReactNode }) => (
    <SafeAreaProvider>
      <PaperProvider theme={WarmHearthTheme}>{children}</PaperProvider>
    </SafeAreaProvider>
  );
}

function customRender(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  const Wrapper = createAppWrapper();
  return render(ui, { wrapper: Wrapper, ...options });
}

export function setup(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  const Wrapper = createAppWrapper();
  return {
    user: userEvent.setup(),
    ...render(ui, { wrapper: Wrapper, ...options }),
  };
}

export * from '@testing-library/react-native';
export { customRender as render };
