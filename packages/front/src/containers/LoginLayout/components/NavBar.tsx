import * as React from 'react';
import Toolbar from 'material-ui/Toolbar';
import Typography from 'material-ui/Typography';
import AppBar from 'material-ui/AppBar';
import withStyles from 'material-ui/styles/withStyles';
import { WithStyles } from 'material-ui/styles';

class NavBar extends React.Component<WithStyles<'root' | 'flex' | 'menuButton'>> {
    public render(): JSX.Element {
        const {classes} = this.props;
        return (
            <AppBar position="static">
                <Toolbar>
                    <Typography variant="title" color="inherit" className={classes.flex}>
                        testRTC
                    </Typography>
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

export default decorate<{}>(NavBar);