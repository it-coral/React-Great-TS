import * as React from 'react';
import Toolbar from 'material-ui/Toolbar';
import IconButton from 'material-ui/IconButton';
import MenuIcon from 'material-ui-icons/Menu';
import Typography from 'material-ui/Typography';
import AppBar from 'material-ui/AppBar';
import withStyles from 'material-ui/styles/withStyles';
import { WithStyles } from 'material-ui/styles';

class MenuBar extends React.Component<WithStyles<'root' | 'flex' | 'menuButton'>> {
    public render(): JSX.Element {
        const {classes} = this.props;
        return (
            <AppBar position="static">
                <Toolbar>
                    <IconButton className={classes.menuButton} color="inherit" aria-label="Menu">
                        <MenuIcon/>
                    </IconButton>
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

export default decorate<{}>(MenuBar);