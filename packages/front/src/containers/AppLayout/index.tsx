import * as React from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import AppContent from './components/AppContent';
import withStyles from 'material-ui/styles/withStyles';
import { Theme, WithStyles } from 'material-ui/styles';

interface AppLayoutState {
    mobileOpen: boolean;
}

class AppLayout extends React.Component<WithStyles<'root'>, AppLayoutState> {
    private initialState: AppLayoutState = {
        mobileOpen: false,
    };

    constructor(props: WithStyles<'root'>) {
        super(props);

        this.state = this.initialState;

        this.handleDrawerToggle = this.handleDrawerToggle.bind(this);
    }

    public handleDrawerToggle(): void {
        this.setState({ mobileOpen: !this.state.mobileOpen });
    }

    render() {
        const { classes } = this.props;

        return (
            <div className={classes.root}>
                <Navbar handleDrawerToggle={this.handleDrawerToggle} />
                <Sidebar
                    mobileOpen={this.state.mobileOpen}
                    handleDrawerToggle={this.handleDrawerToggle}
                />
                <AppContent>
                    {this.props.children}
                </AppContent>
            </div>
        );
    }
}

const styles = (theme: Theme) => ({
    root: {
        flexGrow: 1,
        zIndex: 1,
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        height: '100%',
        width: '100%',
    }
}) as React.CSSProperties;

const decorate = withStyles(styles);

export default decorate<{}>(AppLayout);