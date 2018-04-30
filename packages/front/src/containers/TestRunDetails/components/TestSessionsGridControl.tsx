import * as React from 'react';
import { Grid } from '../../../components/common/Grid/index';
import ApiPath from '../../../constants/ApiPath';
import withStyles from 'material-ui/styles/withStyles';
import { PropTypes, Theme, WithStyles } from 'material-ui';
// import { TestRunGroup } from '../../../constants/RoutesNames';
import Button from 'material-ui/Button';
import Color = PropTypes.Color;
import AxiosFactory from '../../../services/AxiosFactory';
import { AxiosResponse } from 'axios';
import { groupedSchema, unGroupedColumnSchema } from './testSessionsGridSchemas';
import { TestIteration, TestRunGroup } from '../../../constants/RoutesNames';
import { RouteComponentProps, withRouter } from 'react-router';

interface GridMode {
  mode: string;
  name: string;
  color: Color;
  apiPath: string;
  columnSchema: Array<ColumnSchema>;
}

interface ITestSessionsGridControlState {
  gridMode: GridMode;
  gridData: Array<any>, // tslint:disable-line
}

interface ITestSessionsGridControlProps {
  testIterationId: string;
}

type StyledComponent = WithStyles<'root' |
  'tableRowItemHover' |
  'hoverActionBtnStyle' |
  'button'>;

class TestSessionsGridControl extends React.Component<RouteComponentProps<{}> & StyledComponent &
  ITestSessionsGridControlProps, ITestSessionsGridControlState> {
  columnSchema: Array<ColumnSchema> = [
    {
      id: 'id', numeric: false, disablePadding: false, label: 'Manual', style: { maxWidth: '5%' },
    },
  ];

  testSessionsGridModes: Array<GridMode> = [
    {
      mode: 'browser',
      name: 'Browser',
      color: 'primary',
      apiPath: `${ApiPath.api.testIterations}/${this.props.testIterationId}/group/browser`,
      columnSchema: groupedSchema('Browser'),
    },
    {
      mode: 'os',
      name: 'OS',
      color: 'primary',
      apiPath: `${ApiPath.api.testIterations}/${this.props.testIterationId}/group/os`,
      columnSchema: groupedSchema('OS'),
    },
    {
      mode: 'machine',
      name: 'Machine',
      color: 'primary',
      apiPath: `${ApiPath.api.testIterations}/${this.props.testIterationId}/group/machine`,
      columnSchema: groupedSchema('Machine'),
    },
    {
      mode: 'location',
      name: 'Location',
      color: 'primary',
      apiPath: `${ApiPath.api.testIterations}/${this.props.testIterationId}/group/location`,
      columnSchema: groupedSchema('Location'),
    },
    {
      mode: 'ungrouped',
      name: 'Un Grouped',
      color: 'secondary',
      apiPath: `${ApiPath.api.testIterations}/${this.props.testIterationId}/all`,
      columnSchema: unGroupedColumnSchema(this.props.classes.hoverActionBtnStyle),
    },
  ];

  constructor(props: RouteComponentProps<{}> & StyledComponent & ITestSessionsGridControlProps) {
    super(props);

    let defaultGridMode = this.testSessionsGridModes.find(gm => {
      return gm.mode === 'ungrouped';
    });
    this.state = {
      gridMode: (defaultGridMode !== undefined) ? defaultGridMode : this.testSessionsGridModes[0],
      gridData: [],
    };

    this.fetchGridData(this.state.gridMode.apiPath);

    this.onRowClickGrouped = this.onRowClickGrouped.bind(this);
    this.onRowClickUngrouped = this.onRowClickUngrouped.bind(this);
  }

  setGridMode(mode: GridMode) {
    this.setState(
      {
        gridMode: mode,
      },
      () => {
        this.fetchGridData(this.state.gridMode.apiPath);
      });
  }

  public render(): JSX.Element {
    const { classes } = this.props;

    return (
      <React.Fragment>
        <div>
          {this.testSessionsGridModes.map((ctrl, i) => (
            <Button
              key={i}
              className={classes.button}
              color={ctrl.color}
              onClick={() => this.setGridMode(ctrl)}
              variant={(this.state.gridMode !== undefined && ctrl.mode === this.state.gridMode.mode)
                ? 'raised'
                : undefined
              }
            >
              {ctrl.name}
            </Button>
          ))}
        </div>
        {this.state.gridMode.mode !== 'ungrouped' &&
        <Grid
          onRowClick={this.onRowClickGrouped}
          remoteDataBound={false}
          localData={this.state.gridData}
          columnSchema={this.state.gridMode.columnSchema}
          rowProps={{
            className: classes.tableRowItemHover
          }}
        />
        }
        {this.state.gridMode.mode === 'ungrouped' &&
        <Grid
          onRowClick={this.onRowClickUngrouped}
          remoteDataBound={true}
          plainPayload={true}
          columnSchema={this.state.gridMode.columnSchema}
          apiRoute={this.state.gridMode.apiPath}
          defaultSort={
            {
              order: 'asc',
              orderBy: 'statusId,runIndex,machine'
            }
          }
          rowProps={{
            className: classes.tableRowItemHover
          }}
        />
        }
      </React.Fragment>
    );
  }

  private fetchGridData(apiPath: string) {
    let axiosFactory = new AxiosFactory();
    return axiosFactory.axios.get(apiPath)
      .then((res: AxiosResponse) => {
        this.setState({
          gridData: res.data
        });
      });
  }

  private onRowClickUngrouped(e: React.MouseEvent<HTMLTableRowElement>, dataItem: GridModel) {
    this.props.history.push(`${TestIteration}/${dataItem._id}`);
  }

  private onRowClickGrouped(e: React.MouseEvent<HTMLTableRowElement>, dataItem: any) { // tslint:disable-line
    this.props.history.push(`${TestRunGroup}/${this.props.testIterationId}/
    ${this.state.gridMode.mode}/${dataItem.group}`);
  }
}

const styles = (theme: Theme) => ({
  root: {
    width: '100%'
  },
  tableRowItemHover: {
    '&:hover': {
      cursor: 'pointer',
      backgroundColor: '#f7f7f7',
      '& button': {
        visibility: 'visible !important',
        pointerEvents: 'all'
      }
    }
  },
  hoverActionBtnStyle: {
    width: 35,
    minWidth: 35,
    height: 35,
    minHeight: 35,
    visibility: 'hidden',
    pointerEvents: 'none'
  },
  button: {
    margin: theme.spacing.unit,
  }
} as React.CSSProperties);

const decorate = withStyles(styles);

export default withRouter<RouteComponentProps<{}> & ITestSessionsGridControlProps>
(decorate<RouteComponentProps<{}> & ITestSessionsGridControlProps>(TestSessionsGridControl));