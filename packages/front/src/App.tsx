import * as React from 'react';
import { createMuiTheme, MuiThemeProvider } from 'material-ui/styles';
import blue from 'material-ui/colors/blue';
import { Router, Route, Switch } from 'react-router-dom';
import { createBrowserHistory } from 'history';
import SignInPage from './containers/SignInPage/index';
import SignUpPage from './containers/SignUpPage/index';

const theme = createMuiTheme({
    palette: {
        primary: blue,
    },
});

const history = createBrowserHistory();

class App extends React.Component {
    public render() {
        return (
            <MuiThemeProvider theme={theme}>
                <Router history={history}>
                    <Switch>
                        <Route exact={true} path="/" component={SignInPage} />
                        <Route path="/sign-up" component={SignUpPage} />
                    </Switch>
                </Router>
            </MuiThemeProvider>
        );
    }
}

export default App;
