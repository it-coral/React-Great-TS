import * as React from 'react';
// tslint:disable-next-line:align
​import { createMuiTheme, MuiThemeProvider } from 'material-ui/styles';
import blue from 'material-ui/colors/blue';
import { Renderable } from '@storybook/react';

export interface ThemeProviderProps {
  story: Renderable | Renderable[];
}

const theme = createMuiTheme({
  palette: {
      primary: blue,
  },
});​

// tslint:disable-next-line:no-any
export default ({ story }: ThemeProviderProps) => (
  <MuiThemeProvider theme={theme}>
    {story}
  </MuiThemeProvider>
);