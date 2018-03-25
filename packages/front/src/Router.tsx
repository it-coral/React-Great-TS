import * as React from 'react';
import { connect } from 'react-redux';
import { Router, Route, Redirect, Switch } from 'react-router-dom';
import { createBrowserHistory } from 'history';
import AppLayout from './containers/AppLayout';
import LoginLayout from './containers/LoginLayout';
import SignInPage from './containers/SignInPage';
import SignUpPage from './containers/SignUpPage';
import NotFoundPage from './containers/NotFoundPage';
import Main from './containers/Main';

const history = createBrowserHistory();

class RouterContainer extends React.Component<RouterProps> {
    public render() {
        let MainRouteHanlder = (
            <AppLayout>
                <Route path="/app">
                    <Switch>
                        <Route exact={true} path="/main" component={Main} />
                    </Switch>
                </Route>
                <Route path="/404" component={NotFoundPage} />
                <Redirect from="*" to="/404" />
            </AppLayout>
        );

        let AuthRouteHandler = (
            <LoginLayout>
                <Switch>
                    <Route path="/login" component={SignInPage} />
                    <Route path="/signup" component={SignUpPage} />
                    <Redirect from="*" to="/login" />
                </Switch>
            </LoginLayout>
        );

        return (
            <div>
                <Router history={history}>
                    {this.props.user ? MainRouteHanlder : AuthRouteHandler}
                </Router>
            </div>
        );
    }
}

const mapStateToProps = ({ userAuth }: IStore) => ({
    user: userAuth.user
});

export default connect<RouterProps>(mapStateToProps)(RouterContainer);
