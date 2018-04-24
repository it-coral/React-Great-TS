import * as React from 'react';
import { Redirect, Route, Switch } from 'react-router';
import withStyles from 'material-ui/styles/withStyles';
import { Theme, WithStyles } from 'material-ui/styles';
import { CircularProgress } from 'material-ui/Progress';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import AppContent from './components/AppContent';
import withAuth from '../../components/common/auth/withAuth';
import { connect, Dispatch } from 'react-redux';
import { FetchUser } from '../../actions/authAction';
import Main from '../Main';
import Tests from '../Tests';
import TestProperty from '../TestProperty';
import TestRunHistory from '../TestRunHistory';
import { App as AppRoutes, NotFound } from '../../constants/RoutesNames';

interface IAppProps {
    user: User;
}

interface AppLayoutState {
    mobileOpen: boolean;
}

interface IAppDispatch {
    authorize(): void;
}

type StyledComponent = WithStyles<
    'root' |
    'circularProgress'
>;

class AppLayout extends React.Component<IAppProps & IAppDispatch & StyledComponent, AppLayoutState> {
    private initialState: AppLayoutState = {
        mobileOpen: false,
    };

    constructor(props: IAppProps & IAppDispatch & StyledComponent) {
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
            <CircularProgress className={classes.circularProgress} size={80} /> :
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
                        <Route exact={true} path={AppRoutes.TestProperty + '/:objectId'} component={TestProperty}/>
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
    },
    circularProgress: {
        position: 'fixed',
        transform: 'translate(-50%, -50%)',
        left: '50%',
        top: '50%'
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