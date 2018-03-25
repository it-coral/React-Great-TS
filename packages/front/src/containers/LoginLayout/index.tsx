import * as React from 'react';
import NavBar from './components/NavBar';

export default class LoginLayout extends React.Component {
    render() {
        return (
            <div>
                <NavBar />
                {this.props.children}
            </div>
        );
    }
}