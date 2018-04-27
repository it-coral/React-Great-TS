import * as React from 'react';
import List, { ListItem, ListItemIcon, ListItemText } from 'material-ui/List';
import MailIcon from '@material-ui/icons/Mail';

interface UserOptionsListProps {
    options: Array<string>;
}

export class UserOptionsList extends React.Component<UserOptionsListProps> {
    render() {
        const { options } = this.props;

        return (
            <List>
                {options.map((option: string, i: number) => (
                    <ListItem button={true} key={i}>
                        {/* TODO: Custom icon to be added here */}
                        <ListItemIcon>
                            <MailIcon />
                        </ListItemIcon>
                        <ListItemText primary={option} />
                    </ListItem>
                ))}
            </List>
        );
    }
}

export default UserOptionsList;