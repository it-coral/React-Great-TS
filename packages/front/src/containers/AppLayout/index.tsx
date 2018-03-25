import * as React from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';

interface AppLayoutState {
    mobileOpen: boolean;
}

export default class AppLayout extends React.Component<{}, AppLayoutState> {
    private initialState: AppLayoutState = {
        mobileOpen: false,
    };

    constructor(props: AppLayoutState) {
        super(props);

        this.state = this.initialState;

        this.handleDrawerToggle = this.handleDrawerToggle.bind(this);
    }

    handleDrawerToggle(): void {
        this.setState({ mobileOpen: !this.state.mobileOpen });
    }

    render() {
        return (
            <React.Fragment>
                <Navbar />
                <Sidebar
                    mobileOpen={this.state.mobileOpen}
                    handleDrawerToggle={this.handleDrawerToggle}
                />
                <div>
                    {this.props.children}
                </div>
            </React.Fragment>
        );
    }
}