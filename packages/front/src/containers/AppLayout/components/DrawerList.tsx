import * as React from 'react';
import { Theme, withStyles, WithStyles } from 'material-ui/styles';
import Divider from 'material-ui/Divider';
import UserOptionsList from './UserOptionsList';
import AdminOptionsList from './AdminOptionsList';

const SampleUserOptions: Array<string> = [
    'Home',
    'Tests',
    'Test run history',
    'Monitoring',
    'Monitor run history',
    'Analyze webrtc dump',
    'Help'
];

const SampleAdminOptions: Array<string> = [
    'Users Accounts',
    'Projects',
    'Docker Shortcuts',
    'Probes Setup',
    'Dynamic Probe',
    'Admin Utils',
    'Usage Graphs'
];

export class DrawerList extends React.Component<WithStyles<'toolbar'>> {
    render() {
        const {
            classes,
        } = this.props;

        return (
            <div>
                <div className={classes.toolbar} />
                <Divider />
                <UserOptionsList options={SampleUserOptions} />
                <Divider />
                <AdminOptionsList options={SampleAdminOptions} />
            </div>
        );
    }
}

const styles = (theme: Theme) => ({
    toolbar: theme.mixins.toolbar,
});

const decorate = withStyles(styles);

export default decorate<{}>(DrawerList);