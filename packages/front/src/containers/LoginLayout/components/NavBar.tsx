import * as React from 'react';
import Toolbar from 'material-ui/Toolbar';
import AppBar from 'material-ui/AppBar';
import withStyles from 'material-ui/styles/withStyles';
import { WithStyles } from 'material-ui/styles';
import { withRouter, RouteComponentProps } from 'react-router-dom';

class NavBar extends React.Component<RouteComponentProps<{}> & WithStyles<'root' | 'flex' | 'menuButton'>> {
    public render(): JSX.Element {
        const {classes} = this.props;
        return (
            <AppBar position="static">
                <Toolbar>
                    <div
                        onClick={() => this.props.history.push('/')}
                        className={classes.flex}
                    >
                        <img height="55" src="assets/images/logo_text2.png"/>
                    </div>
                </Toolbar>
            </AppBar>
        );
    }
}

const decorate = withStyles(() => ({
    root: {
        flexGrow: 1,
    },
    flex: {
        flex: 1,
    },
    menuButton: {
        marginLeft: -12,
        marginRight: 20,
    },
}));

export default withRouter<any>(decorate<{}>(NavBar)); // tslint:disable-line