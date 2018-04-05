import * as React from 'react';
import Paper from 'material-ui/Paper';
import { Theme, withStyles, WithStyles } from 'material-ui/styles';
import { Grid } from '../../components/common/Grid';
import ApiPath from '../../constants/ApiPath';
import GridToolbar from './GridToolbar';

const columnSchema: Array<ColumnSchema> = [
    { id: 'name', numeric: false, disablePadding: false, label: 'Name' },
    { id: 'info', numeric: false, disablePadding: true, label: 'Description', sortable: false },
    { id: 'runCount', numeric: true, disablePadding: false, label: 'Run Count' },
    { id: 'lastRunDate', numeric: false, disablePadding: false, label: 'Last Run' }
];

export class GridControl extends React.Component<{} & WithStyles<'root'>> {
    render() {
        const { classes } = this.props;

        return (
            <Paper className={classes.root}>
                <GridToolbar />
                <Grid
                    apiRoute={ApiPath.api.testDefinitions}
                    columnSchema={columnSchema}
                    defaultSort={{
                        order: 'desc',
                        orderBy: 'lastRunDate'
                    }}
                />
            </Paper>
        );
    }
}

const styles = (theme: Theme) => ({
    root: {
        width: '100%'
    }
} as React.CSSProperties);

const decorate = withStyles(styles);

export default decorate<{}>(GridControl);