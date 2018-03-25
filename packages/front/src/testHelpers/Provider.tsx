import * as React from 'react';
// tslint:disable-next-line:align
​import store from '../store';
import { Provider as ReduxProvider } from 'react-redux';
import { Renderable } from '@storybook/react';

export interface ProviderProps {
  story: Renderable | Renderable[];
}

export default ({ story }: ProviderProps) => (
  <ReduxProvider store={store}>
    {story}
  </ReduxProvider>
);