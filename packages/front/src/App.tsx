import * as React from 'react';
import { createMuiTheme, MuiThemeProvider } from 'material-ui/styles';
import blue from 'material-ui/colors/blue';
import green from 'material-ui/colors/green';
import CssBaseline from 'material-ui/CssBaseline';
import Router from './Router';

const theme = createMuiTheme({
    palette: {
        primary: blue,
        secondary: {
            light: green[500],
            main: green[700],
            dark: green[800],
            contrastText: '#ffffff',
        },
    },
});

export default class App extends React.Component<{}> {
    public render() {
        return (
            <MuiThemeProvider theme={theme}>
                <CssBaseline/>
                <Router/>
            </MuiThemeProvider>
        );
    }
}
