import * as React from 'react';
import { storiesOf, RenderFunction } from '@storybook/react';
import AppLayout from '../src/containers/Layout';
import ThemeProvider from '../src/testHelpers/ThemeProvider';
import RouterProvider from '../src/testHelpers/RouterProvider';

storiesOf('AppLayout', module)
  .addDecorator((story: RenderFunction) => <ThemeProvider story={story()} />)
  .addDecorator((story: RenderFunction) => <RouterProvider story={story()} />)
  .add('Default', () => React.createElement(AppLayout));
