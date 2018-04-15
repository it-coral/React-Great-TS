import * as React from 'react';
import Paper from 'material-ui/Paper';
import { Theme, withStyles, WithStyles } from 'material-ui/styles';
import * as moment from 'moment';
import { Grid } from '../../components/common/Grid';
import ApiPath from '../../constants/ApiPath';
import GridToolbar from './GridToolbar';
import { RouteComponentProps } from 'react-router';
import { TestProperty } from '../../constants/RoutesNames';

const columnSchema: Array<ColumnSchema> = [
  { id: 'name', numeric: false, disablePadding: false, label: 'Name' },
  { id: 'info', numeric: false, disablePadding: true, label: 'Description', sortable: false },
  { id: 'runCount', numeric: true, disablePadding: false, label: 'Run Count' },
  {
    id: 'lastRunDate', numeric: false, disablePadding: false, label: 'Last Run',
    render: (date) => date ? moment(date).format('MMM DD, YYYY - HH:mm') : 'never',
    style: {
      whiteSpace: 'nowrap'
    }
  }
];

export class GridControl extends React.Component<RouteComponentProps<{}> & WithStyles<'root'>> {
  constructor(props: RouteComponentProps<{}> & WithStyles<'root'>) {
    super(props);

    this.onRowClick = this.onRowClick.bind(this);
  }

  onRowClick(e: React.MouseEvent<HTMLTableRowElement>, dataItem: GridModel) {
    this.props.history.push(`${TestProperty}/${dataItem._id}`);
  }

  render() {
    const { classes } = this.props;

    return (
      <Paper className={classes.root}>
        <GridToolbar />
        <Grid
          onRowClick={this.onRowClick}
          search={true}
          searchByLabel={'name/description'}
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