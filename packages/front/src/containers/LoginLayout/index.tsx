import * as React from 'react';
import NavBar from './components/NavBar';
import WorkingSection from './components/WorkingSection';
import { Redirect, Route, Switch } from 'react-router';
import SignInPage from '../../containers/SignInPage';
import SignUpPage from '../../containers/SignUpPage';
import SignUpConfirmPage from '../SignUpConfirmPage';

export default class LoginLayout extends React.Component {
    render() {
        return (
            <React.Fragment>
                <NavBar/>
                <WorkingSection>
                    <Switch>
                        <Route path="/signin" component={SignInPage}/>
                        <Route path="/signup" component={SignUpPage}/>
                        <Route path="/signup-confirm" component={SignUpConfirmPage}/>
                        <Redirect from="/" to="/signin"/>
                    </Switch>
                </WorkingSection>
            </React.Fragment>
        );
    }
}