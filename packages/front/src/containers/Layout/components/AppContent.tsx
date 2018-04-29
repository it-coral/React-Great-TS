import * as React from 'react';
import withStyles from 'material-ui/styles/withStyles';
import { Theme, WithStyles } from 'material-ui/styles';
import AppBar from 'material-ui/AppBar';
import Toolbar from 'material-ui/Toolbar';
import Typography from 'material-ui/Typography';
import { NavbarHeight, DrawerWidth } from '../../../styles/Constants';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import { getLocationTitle } from '../../../constants/PageStateDictionary';

class AppContent extends React.Component<WithStyles<
'content' |
'toolbar' |
'contentWrapper' |
'headText' |
'appBar'> & RouteComponentProps<{}>> {
    public render(): JSX.Element {
        const { classes, location } = this.props;
        return (
            <main className={classes.content}>
                <AppBar
                    className={classes.appBar}
                    position="static"
                    color="default"
                >
                    <Toolbar className={classes.toolbar}>
                        <Typography className={classes.headText} variant="title" color="inherit">
                            {getLocationTitle(location.pathname)}
                        </Typography>
                    </Toolbar>
                </AppBar>
                <div className={classes.contentWrapper}>
                    {this.props.children}
                </div>
            </main>
        );
    }
}

const styles = (theme: Theme) => ({
    appBar: {
        boxShadow: 'none',
        color: '#83807D'
    },
    toolbar: theme.mixins.toolbar,
    headText: {
        fontWeight: 400
    },
    content: {
        width: '100%',
        height: `calc(100% - ${NavbarHeight}px)`,
        [theme.breakpoints.up('md')]: {
            position: 'relative',
            width: `calc(100% - ${DrawerWidth}px)`,
        },
        flexGrow: 1,
        backgroundColor: '#D6D7DB',
        padding: 0,
        marginTop: NavbarHeight,
        overflowY: 'auto'
    },
    contentWrapper: {
        padding: theme.spacing.unit * 3
    }
} as React.CSSProperties);

const decorate = withStyles(styles);

export default withRouter<RouteComponentProps<{}>>(decorate<RouteComponentProps<{}>>(AppContent));