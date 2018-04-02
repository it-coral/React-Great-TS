import * as React from 'react';
import { NavLink } from 'react-router-dom';
import List, { ListItem, ListItemIcon, ListItemText } from 'material-ui/List';
import { Theme, withStyles, WithStyles } from 'material-ui/styles';
import { ListLink, ListLinkActive, ListItemStyle, ListItemTextStyle, ListItemIconStyle } from '../../../styles/Sidebar';
import { ListItemDescriptor } from './DrawerList';

interface UserOptionsListProps {
    options: Array<ListItemDescriptor>;
}

export class UserOptionsList extends React.Component<UserOptionsListProps
    & WithStyles<'ListItemTextStyle' | 'ListItemStyle' | 'listItemIcon'| 'ListItemIconStyle'>> {
    render() {
        const { options, classes } = this.props;

        return (
            <List>
                {options.map((option: ListItemDescriptor) => (
                    <ListItem
                        // TODO: remove hardcoded disable
                        disabled={option.label !== 'Tests' && option.label !== 'Home'}
                        button={true}
                        className={classes.ListItemStyle}
                    >
                        <NavLink
                            exact={true}
                            to={option.link}
                            activeStyle={ListLinkActive}
                            style={ListLink}
                        >
                            {/* TODO: Custom icon to be added here */}
                            <ListItemIcon>
                                <option.icon className={classes.ListItemIconStyle} />
                            </ListItemIcon>
                            <ListItemText
                                classes={{
                                    primary: classes.ListItemTextStyle
                                }}
                                primary={option.label}
                            />
                        </NavLink>
                    </ListItem>
                ))}
            </List>
        );
    }
}

const styles = (theme: Theme) => ({
    ListItemStyle,
    ListItemTextStyle,
    ListItemIconStyle
});

const decorate = withStyles(styles);

export default decorate<UserOptionsListProps>(UserOptionsList);