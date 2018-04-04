import * as React from 'react';
import { Grid } from '../../components/common/Grid';
import ApiPath from '../../constants/ApiPath';

const columnSchema: Array<ColumnSchema> = [
    { id: 'name', numeric: false, disablePadding: false, label: 'Name' },
    { id: 'info', numeric: false, disablePadding: true, label: 'Description', sortable: false },
    { id: 'runCount', numeric: true, disablePadding: false, label: 'Run Count' },
    { id: 'lastRunDate', numeric: false, disablePadding: false, label: 'Last Run' }
];

export default class GridControl extends React.Component {
    render() {
        return (
            <Grid
                apiRoute={ApiPath.api.testDefinitions}
                columnSchema={columnSchema}
                defaultSort={{
                    order: 'desc',
                    orderBy: 'lastRunDate'
                }}
            />
        );
    }
}