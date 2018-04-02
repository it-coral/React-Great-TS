import * as React from 'react';
import { connect } from 'react-redux';
import { Router, Route, Switch, Redirect } from 'react-router-dom';
import { createBrowserHistory } from 'history';
import AppLayout from './containers/AppLayout';
import LoginLayout from './containers/LoginLayout';
import NotFoundPage from './containers/NotFoundPage';

import AuthService from './services/AuthService';

const history = createBrowserHistory();

class RouterContainer extends React.Component<RouterProps> {
    auth: AuthService;

    constructor(props: RouterProps) {
        super(props);

        this.auth = new AuthService();
    }

    public render() {
        return (
            <Router history={history}>
                <Switch>
                    <Route path="/app" component={AppLayout}/>
                    <Route path="/404" component={NotFoundPage}/>
                    <Route path="/" component={LoginLayout}/>
                    <Redirect from="*" to="/404"/>
                </Switch>
            </Router>
        );
    }
}

const mapStateToProps = ({userAuth}: IStore) => ({
    user: userAuth.user
});

export default connect<RouterProps>(mapStateToProps)(RouterContainer);
