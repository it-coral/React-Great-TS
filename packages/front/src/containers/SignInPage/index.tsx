import * as React from 'react';
import { Link } from 'react-router-dom';

interface ILoginPageProps {
    test: string;
}

class SignInPage extends React.Component<ILoginPageProps> {
    public render(): JSX.Element {
        return (
            <div>
                <h1>SignIn page</h1>
                <Link to={'/signup'}>Go to sign-up page</Link>
            </div>
        );
    }
}

export default SignInPage;