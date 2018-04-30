import * as React from 'react';
import Hidden from 'material-ui/Hidden';
import { Theme, withStyles, WithStyles } from 'material-ui/styles';
import Drawer from 'material-ui/Drawer';
import DrawerList from './DrawerList';
import { DrawerWidth, NavbarHeight } from '../../../styles/Constants';

interface SidebarProps {
  mobileOpen: boolean;
  handleDrawerToggle(): void;
}

export class Sidebar extends React.Component<SidebarProps & WithStyles<'drawerPaper' | 'drawerDocked'>> {
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
              docked: classes.drawerDocked,
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
              docked: classes.drawerDocked,
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

const styles = (theme: Theme) => ({
  drawerDocked: {
    height: `calc(100% - ${NavbarHeight}px)`,
    marginTop: NavbarHeight,
  },
  drawerPaper: {
    backgroundColor: '#273238',
    width: DrawerWidth,
    height: '100%',
    [theme.breakpoints.up('md')]: {
      position: 'relative',
    },
  } as React.CSSProperties,
});

const decorate = withStyles(styles);

export default decorate<SidebarProps>(Sidebar);