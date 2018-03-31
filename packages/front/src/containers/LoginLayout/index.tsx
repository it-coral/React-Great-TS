import * as React from 'react';
import NavBar from './components/NavBar';
import WorkingSection from './components/WorkingSection';

export default class LoginLayout extends React.Component {
    render() {
        return (
            <React.Fragment>
                <NavBar />
                <WorkingSection>
                    {this.props.children}
                </WorkingSection>
            </React.Fragment>
        );
    }
}