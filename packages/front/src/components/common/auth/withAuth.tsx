import * as React from 'react';
import Auth0Service from '../../../services/Auth0Service';
import { Redirect } from 'react-router';

interface WithRoles {
    roles?: string[];
}

const withAuth = <P extends WithRoles>(UnwrappedComponent: React.ComponentType<P>) =>
    class WithAuth extends React.Component<P> {
        auth: Auth0Service;

        constructor(props: P) {
            super(props);

            this.auth = new Auth0Service();
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