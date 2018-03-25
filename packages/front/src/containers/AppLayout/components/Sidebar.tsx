import * as React from 'react';
import Hidden from 'material-ui/Hidden';
import { Theme, withStyles, WithStyles } from 'material-ui/styles';
import Drawer from 'material-ui/Drawer';
import DrawerList from './DrawerList';

interface SidebarProps {
    mobileOpen: boolean;
    handleDrawerToggle(): void;
}

export class Sidebar extends React.Component<SidebarProps & WithStyles<'drawerPaper'>> {
    render() {
        const {
            classes,
            handleDrawerToggle,
            mobileOpen
        } = this.props;

        return (
            <React.Fragment>
                <Hidden mdUp={true}>
                    <Drawer
                        variant="temporary"
                        anchor={'left'}
                        open={mobileOpen}
                        onClose={handleDrawerToggle}
                        classes={{
                            paper: classes.drawerPaper,
                        }}
                        ModalProps={{
                            keepMounted: true, // Better open performance on mobile.
                        }}
                    >
                        <DrawerList />
                    </Drawer>
                </Hidden>
                <Hidden smDown={true} implementation="css">
                    <Drawer
                        variant="permanent"
                        open={true}
                        classes={{
                            paper: classes.drawerPaper,
                        }}
                    >
                        <DrawerList />
                    </Drawer>
                </Hidden>
            </React.Fragment>
        );
    }
}

const drawerWidth = 240;

const styles = (theme: Theme) => ({
    drawerPaper: {
        width: drawerWidth,
        [theme.breakpoints.up('md')]: {
            position: 'relative',
        },
    },
});

const decorate = withStyles(styles);

export default decorate<SidebarProps>(Sidebar);