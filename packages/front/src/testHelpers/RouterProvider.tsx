import * as React from 'react';
import { Router } from 'react-router-dom';
import { Renderable } from '@storybook/react';
import { createBrowserHistory } from 'history';

const history = createBrowserHistory();

export interface ProviderProps {
  story: Renderable | Renderable[];
}

export default ({ story }: ProviderProps) => (
  <Router history={history}>
    {story}
  </Router>
);