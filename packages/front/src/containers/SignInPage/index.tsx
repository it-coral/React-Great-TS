import * as React from 'react';
import { Link } from 'react-router-dom';

interface LoginPageProps {
    test: string;
}

class SignInPage extends React.Component<LoginPageProps> {
    public render(): JSX.Element {
        return (
            <div>
                <h1>SignIn page</h1>
                <Link to={'/sign-up'}>Go to sign-up page</Link>
            </div>
        );
    }
}

export default SignInPage;