import * as React from 'react';
import { createMuiTheme, MuiThemeProvider } from 'material-ui/styles';
import blue from 'material-ui/colors/blue';
import CssBaseline from 'material-ui/CssBaseline';
import Router from './Router';

const theme = createMuiTheme({
    palette: {
        primary: blue,
    },
});

export default class App extends React.Component<{}> {
    public render() {
        return (
            <MuiThemeProvider theme={theme}>
                <CssBaseline />
                <Router />
            </MuiThemeProvider>
        );
    }
}
