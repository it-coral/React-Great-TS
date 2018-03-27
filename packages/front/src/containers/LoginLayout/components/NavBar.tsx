import * as React from 'react';
import Toolbar from 'material-ui/Toolbar';
import AppBar from 'material-ui/AppBar';
import withStyles from 'material-ui/styles/withStyles';
import { WithStyles } from 'material-ui/styles';
import { withRouter, RouteComponentProps } from 'react-router-dom';

class NavBar extends React.Component<RouteComponentProps<{}> & WithStyles<
    'appBar' |
    'toolbar' |
    'logoContainer' |
    'logoImage'>> {
    public render(): JSX.Element {
        const { classes } = this.props;

        return (
            <AppBar
                position="static"
                className={classes.appBar}
            >
                <Toolbar className={classes.toolbar}>
                    <div
                        className={classes.logoContainer}
                        onClick={() => this.props.history.push('/')}
                    >
                        <img className={classes.logoImage} src="assets/images/logo_text2.png"/>
                    </div>
                </Toolbar>
            </AppBar>
        );
    }
}

const styles = {
    toolbar: {
        height: '100%'
    },
    appBar: {
        height: 70,
        backgroundColor: '#FDFDFD',
        boxShadow: 'none'
    },
    logoContainer: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: '10%'
    },
    logoImage: {
        height: 'auto',
        maxHeight: 50
    }
} as React.CSSProperties;

const decorate = withStyles(() => styles);

export default withRouter<RouteComponentProps<{}>>(decorate<RouteComponentProps<{}>>(NavBar));