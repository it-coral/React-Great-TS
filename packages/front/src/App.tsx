import * as React from 'react';
import { createMuiTheme, MuiThemeProvider } from 'material-ui/styles';
import green from 'material-ui/colors/green';
import CssBaseline from 'material-ui/CssBaseline';
import Router from './Router';

const theme = createMuiTheme({
    palette: {
        primary: {
            light: '#6598d1',
            main: '#4682C3',
            dark: '#3e76b2',
            contrastText: '#ffffff'
        },
        secondary: {
            light: green[500],
            main: '#559542',
            dark: green[800],
            contrastText: '#ffffff'
        }
    }
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
