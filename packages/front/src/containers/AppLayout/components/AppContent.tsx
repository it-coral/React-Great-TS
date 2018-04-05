import * as React from 'react';
import withStyles from 'material-ui/styles/withStyles';
import { Theme, WithStyles } from 'material-ui/styles';
import AppBar from 'material-ui/AppBar';
import Toolbar from 'material-ui/Toolbar';
import Typography from 'material-ui/Typography';
import { NavbarHeight, DrawerWidth } from '../../../styles/Constants';

class AppContent extends React.Component<WithStyles<
'content' |
'toolbar' |
'contentWrapper' |
'appBar'>> {
    public render(): JSX.Element {
        const { classes } = this.props;
        return (
            <main className={classes.content}>
                <AppBar
                    className={classes.appBar}
                    position="static"
                    color="default"
                >
                    <Toolbar className={classes.toolbar}>
                        <Typography variant="title" color="inherit">
                            Title
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

export default decorate<{}>(AppContent);