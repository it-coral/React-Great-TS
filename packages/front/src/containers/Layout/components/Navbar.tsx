import * as React from 'react';
import Toolbar from 'material-ui/Toolbar';
import IconButton from 'material-ui/IconButton';
import MenuIcon from '@material-ui/icons/Menu';
import AppBar from 'material-ui/AppBar';
import withStyles from 'material-ui/styles/withStyles';
import { Theme, WithStyles } from 'material-ui/styles';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import LOGO_IMG from '../../../assets/images/logo_text2.png';
import Logout from './Logout';

interface NavBarProps {
    handleDrawerToggle(): void;
}

class NavBar extends React.Component<NavBarProps & RouteComponentProps<{}>
& WithStyles<'appBar' | 'navIconHide' | 'menuIcon' | 'toolbar'>> {
    public render(): JSX.Element {
        const {
            classes,
            handleDrawerToggle
        } = this.props;
        return (
            <AppBar
                position="static"
                className={classes.appBar}
            >
                <Toolbar className={classes.toolbar}>
                    <div>
                        <IconButton
                            className={classes.navIconHide}
                            color="inherit"
                            aria-label="Menu"
                            onClick={handleDrawerToggle}
                        >
                            <MenuIcon className={classes.menuIcon} />
                        </IconButton>
                        <div>
                            <img height="55" src={LOGO_IMG} />
                        </div>
                    </div>
                    <Logout/>
                </Toolbar>
            </AppBar>
        );
    }
}

const styles = (theme: Theme) => ({
    appBar: {
        backgroundColor: '#FDFDFD',
        position: 'absolute',
        zIndex: theme.zIndex.drawer + 1,
        top: 0,
        left: 0,
        width: '100%',
    },
    navIconHide: {
        [theme.breakpoints.up('md')]: {
            display: 'none',
        },
    },
    menuIcon: {
        color: 'black'
    },
    toolbar: {
        display: 'flex',
        justifyContent: 'space-between',
    }
} as React.CSSProperties);

const decorate = withStyles(styles);

export default withRouter<RouteComponentProps<{}> & NavBarProps>(
    decorate<RouteComponentProps<{}> & NavBarProps>(NavBar)
);
