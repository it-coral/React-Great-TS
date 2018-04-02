import * as React from 'react';
import AuthService from '../../../services/AuthService';
import { Redirect } from 'react-router';

interface WithRoles {
    roles?: string[];
}

const withAuth = <P extends WithRoles>(UnwrappedComponent: React.ComponentType<P>) =>
    class WithAuth extends React.Component<P> {
        auth: AuthService;

        constructor(props: P) {
            super(props);

            this.auth = new AuthService();
        }

        public render(): JSX.Element {
            if (!this.auth.loggedIn()) {
                return <Redirect to="/signin" push={true}/>;
            }
            return (
                <UnwrappedComponent
                    {...this.props}
                />
            );
        }
    };

export default withAuth;