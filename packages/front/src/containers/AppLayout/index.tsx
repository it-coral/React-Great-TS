import * as React from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import AppContent from './components/AppContent';
import withStyles from 'material-ui/styles/withStyles';
import { Theme, WithStyles } from 'material-ui/styles';
import { Redirect, Route, Switch } from 'react-router';
import withAuth from '../../components/common/auth/withAuth';
import { connect, Dispatch } from 'react-redux';
import { FetchUser } from '../../actions/authAction';
import Main from '../Main';
import Tests from '../TestsPage';
import TestProperty from '../TestProperty';
import TestRunHistory from '../TestRunHistory';
import { App as AppRoutes, NotFound } from '../../constants/RoutesNames';
import { CircularProgress } from 'material-ui/Progress';

interface IAppProps {
    user: User;
}

interface AppLayoutState {
    mobileOpen: boolean;
}

interface IAppDispatch {
    authorize(): void;
}

class AppLayout extends React.Component<IAppProps & IAppDispatch & WithStyles<'root'>, AppLayoutState> {
    private initialState: AppLayoutState = {
        mobileOpen: false,
    };

    constructor(props: IAppProps & IAppDispatch & WithStyles<'root'>) {
        super(props);

        this.state = this.initialState;

        this.handleDrawerToggle = this.handleDrawerToggle.bind(this);
    }

    componentDidMount() {
        this.props.authorize();
    }

    public handleDrawerToggle(): void {
        this.setState({ mobileOpen: !this.state.mobileOpen });
    }

    render() {
        const { classes } = this.props;

        return this.props.user === null ?
            <CircularProgress size={80}/> :
            (
                <div className={classes.root}>
                <Navbar handleDrawerToggle={this.handleDrawerToggle} />
                <Sidebar
                    mobileOpen={this.state.mobileOpen}
                    handleDrawerToggle={this.handleDrawerToggle}
                />
                <AppContent>
                    <Switch>
                        <Redirect exact={true} from="/" to={AppRoutes.Main} />
                        <Route exact={true} path={AppRoutes.Main} component={Main}/>
                        <Route exact={true} path={AppRoutes.Tests} component={Tests}/>
                        <Route exact={true} path={AppRoutes.TestRun} component={TestRunHistory}/>
                        <Route exact={true} path={AppRoutes.NewTestProperty} component={TestProperty}/>
                        <Redirect from="*" to={NotFound} />
                    </Switch>
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

const mapDispatchToProps = (dispatch: Dispatch<IStore>): IAppDispatch => ({
    authorize: () => dispatch(FetchUser()),
});

const mapStateToProps = (state: IStore) => ({
    user: state.userAuth.user,
});

const decorate = withStyles(styles);

// tslint:disable-next-line:no-any
export default withAuth(
    connect<IAppProps, IAppDispatch, IAppProps & IAppDispatch>(mapStateToProps, mapDispatchToProps)(
        decorate<IAppProps & IAppDispatch>(AppLayout)
    )
);