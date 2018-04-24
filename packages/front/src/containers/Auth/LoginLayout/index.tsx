import * as React from 'react';
import NavBar from './components/NavBar';
import WorkingSection from './components/WorkingSection';
import { Redirect, Route, Switch } from 'react-router';
import SignInPage from '../SignInPage';
import SignUpPage from '../SignUpPage';
import { Login as LoginRoutes } from '../../../constants/RoutesNames';
import SignUpConfirmPage from '../SignUpConfirmPage';
import ForgotPasswordPage from '../ForgotPasswordPage/index';

export default class LoginLayout extends React.Component {
    render() {
        return (
            <React.Fragment>
                <NavBar/>
                <WorkingSection>
                    <Switch>
                        <Route exact={true} path={LoginRoutes.SignIn} component={SignInPage}/>
                        <Route exact={true} path={LoginRoutes.SignUp} component={SignUpPage}/>
                        <Route exact={true} path={LoginRoutes.ForgotPassword} component={ForgotPasswordPage}/>
                        <Route exact={true} path={`${LoginRoutes.SignUpConfirm}/:email`} component={SignUpConfirmPage}/>
                        <Redirect exact={true} from="/" to="/signin"/>
                    </Switch>
                </WorkingSection>
            </React.Fragment>
        );
    }
}