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
import Tests from './containers/TestsPage';
import TestRunHistory from './containers/TestRunHistory';

const history = createBrowserHistory();

class RouterContainer extends React.Component<RouterProps> {
    public render() {
        let MainRouteHanlder = (
            <AppLayout>
                <Switch>
                    <Redirect exact={true} from="/" to="/main" />
                    <Route path="/main" component={Main}/>
                    <Route path="/testDefinition" component={Tests}/>
                    <Route path="/testRun" component={TestRunHistory}/>
                    <Route path="/404" component={NotFoundPage} />
                    <Redirect from="*" to="/404" />
                </Switch>
            </AppLayout>
        );

        let AuthRouteHandler = (
            <LoginLayout>
                <Switch>
                    <Route path="/signin" component={SignInPage} />
                    <Route path="/signup" component={SignUpPage} />
                    <Redirect from="*" to="/signin" />
                </Switch>
            </LoginLayout>
        );

        return (
            <Router history={history}>
                {this.props.user ? MainRouteHanlder : AuthRouteHandler}
            </Router>
        );
    }
}

const mapStateToProps = ({ userAuth }: IStore) => ({
    user: userAuth.user
});

export default connect<RouterProps>(mapStateToProps)(RouterContainer);
