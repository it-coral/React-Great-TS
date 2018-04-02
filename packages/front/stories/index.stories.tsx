import * as React from 'react';
import { storiesOf, RenderFunction } from '@storybook/react';
import AppLayout from '../src/containers/AppLayout';
import ThemeProvider from '../src/testHelpers/ThemeProvider';

storiesOf('AppLayout', module)
  .addDecorator((story: RenderFunction) => <ThemeProvider story={story()} />)
  .add('Default', () => React.createElement(AppLayout));
