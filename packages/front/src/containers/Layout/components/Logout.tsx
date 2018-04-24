import * as React from 'react';
import Button from 'material-ui/Button';
import AuthService from '../../../services/AuthService';
import { RouteComponentProps, withRouter } from 'react-router';
import { Login as LoginRoutes } from '../../../constants/RoutesNames';

class Logout extends React.Component<RouteComponentProps<{}>> {
    auth: AuthService;

    constructor(props: RouteComponentProps<{}>) {
        super(props);

        this.auth = new AuthService();
    }

    public render(): JSX.Element {
        return (
            <Button onClick={() => this.logOut()} color="primary">Logout</Button>
        );
    }

    private logOut(): void {
        this.auth.logout();
        this.props.history.push(LoginRoutes.SignIn);
    }
}

export default withRouter<RouteComponentProps<{}>>(Logout);