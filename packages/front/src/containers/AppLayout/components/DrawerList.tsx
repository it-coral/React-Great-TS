import * as React from 'react';
import { Theme, withStyles, WithStyles } from 'material-ui/styles';
import Divider from 'material-ui/Divider';
import { SvgIconProps } from 'material-ui/SvgIcon';
import UserOptionsList from './UserOptionsList';
// import AdminOptionsList from './AdminOptionsList';

import HomeIcon from 'material-ui-icons/Home';
import ForwardIcon from 'material-ui-icons/Forward';
import HistoryIcon from 'material-ui-icons/History';
import WatchLaterIcon from 'material-ui-icons/WatchLater';

export interface ListItemDescriptor {
    icon: React.ComponentType<SvgIconProps>;
    label: string;
    link: string;
}

const SampleUserOptions: Array<ListItemDescriptor> = [
    {
        icon: HomeIcon,
        label: 'Home',
        link: '/'
    },
    {
        icon: ForwardIcon,
        label: 'Tests',
        link: '/testDefinition'
    },
    {
        icon: HistoryIcon,
        label: 'Test run history',
        link: '/testRun'
    },
    {
        icon: WatchLaterIcon,
        label: 'Monitoring',
        link: '/monitoring'
    },
    // {
    //     icon: ForwardIcon,
    //     label: 'Test run history',
    //     link: '/testRun'
    // },
    // 'Monitoring',
    // 'Monitor run history',
    // 'Analyze webrtc dump',
    // 'Help'
];

// const SampleAdminOptions: Array<string> = [
//     'Users Accounts',
//     'Projects',
//     'Docker Shortcuts',
//     'Probes Setup',
//     'Dynamic Probe',
//     'Admin Utils',
//     'Usage Graphs'
// ];

export class DrawerList extends React.Component<WithStyles<'toolbar'>> {
    render() {
        return (
            <React.Fragment>
                <UserOptionsList options={SampleUserOptions} />
                <Divider />
                {/* <AdminOptionsList options={SampleAdminOptions} /> */}
            </React.Fragment>
        );
    }
}

const styles = (theme: Theme) => ({
    toolbar: theme.mixins.toolbar,
});

const decorate = withStyles(styles);

export default decorate<{}>(DrawerList);