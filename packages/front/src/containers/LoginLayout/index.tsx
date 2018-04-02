import * as React from 'react';
import NavBar from './components/NavBar';
import WorkingSection from './components/WorkingSection';
import { Redirect, Route, Switch } from 'react-router';
import SignInPage from '../../containers/SignInPage';
import SignUpPage from '../../containers/SignUpPage';
import { Login as LoginRoutes } from '../../constants/RoutesNames';

export default class LoginLayout extends React.Component {
    render() {
        return (
            <React.Fragment>
                <NavBar/>
                <WorkingSection>
                    <Switch>
                        <Route exact={true} path={LoginRoutes.SignIn} component={SignInPage}/>
                        <Route exact={true} path={LoginRoutes.SignUp} component={SignUpPage}/>
                        <Redirect exact={true} from="/" to="/signin"/>
                    </Switch>
                </WorkingSection>
            </React.Fragment>
        );
    }
}