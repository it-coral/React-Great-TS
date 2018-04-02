import * as React from 'react';
import { Theme, withStyles, WithStyles } from 'material-ui/styles';
import Divider from 'material-ui/Divider';
import { SvgIconProps } from 'material-ui/SvgIcon';
import UserOptionsList from './UserOptionsList';

import HomeIcon from 'material-ui-icons/Home';
import ForwardIcon from 'material-ui-icons/Forward';
import HistoryIcon from 'material-ui-icons/History';
import WatchLaterIcon from 'material-ui-icons/WatchLater';
import { App as AppRoutes } from '../../../constants/RoutesNames';

export interface ListItemDescriptor {
    icon: React.ComponentType<SvgIconProps>;
    label: string;
    link: string;
}

const SampleUserOptions: Array<ListItemDescriptor> = [
    {
        icon: HomeIcon,
        label: 'Home',
        link: AppRoutes.Main
    },
    {
        icon: ForwardIcon,
        label: 'Tests',
        link: AppRoutes.Tests
    },
    {
        icon: HistoryIcon,
        label: 'Test run history',
        link: AppRoutes.TestRun
    },
    {
        icon: WatchLaterIcon,
        label: 'Monitoring',
        link: AppRoutes.Monitoring
    },
];

export class DrawerList extends React.Component<WithStyles<'toolbar'>> {
    render() {
        return (
            <React.Fragment>
                <UserOptionsList options={SampleUserOptions} />
                <Divider />
            </React.Fragment>
        );
    }
}

const styles = (theme: Theme) => ({
    toolbar: theme.mixins.toolbar,
});

const decorate = withStyles(styles);

export default decorate<{}>(DrawerList);