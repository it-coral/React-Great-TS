import * as React from 'react';
import Paper from 'material-ui/Paper';
import { Theme, withStyles, WithStyles } from 'material-ui/styles';
import { FilterValue, Grid, GridFilter } from '../../components/common/Grid';
import ApiPath from '../../constants/ApiPath';
import { RouteComponentProps } from 'react-router';
import { TestRunDetails } from '../../constants/RoutesNames';
import Flag from '@material-ui/icons/Flag';
import Build from '@material-ui/icons/Build';
import Done from '@material-ui/icons/Done';
import DoneAll from '@material-ui/icons/DoneAll';
import ExitToApp from '@material-ui/icons/ExitToApp';
import Replay from '@material-ui/icons/Replay';
import PlayArrow from '@material-ui/icons/PlayArrow';
import RemoveCircle from '@material-ui/icons/RemoveCircle';
import Warning from '@material-ui/icons/Warning';
import Error from '@material-ui/icons/Error';
import Timer from '@material-ui/icons/Timer';
import * as moment from 'moment';
import { ReactNode } from 'react';
import Tooltip from 'material-ui/Tooltip';
import { connect, Dispatch } from 'react-redux';
import { FetchTestsDistinct } from '../../actions/dictionaryAction';

interface ITestHistoryState {
  filters: Array<GridFilter>;
  testRuns: Array<FilterValue>;
}

interface ITestsHistoryDispatch {
  fetchTestsDistinct(): void;
}

interface ITestHistoryProps {
  testRuns: Array<string>;
}

const tooltipHelper = (title: string, icon: ReactNode): ReactNode => {
  return <Tooltip title={title}>{React.createElement('div', null, icon)}</Tooltip>;
};

const columnSchema: Array<ColumnSchema> = [
  {id: 'manual', numeric: false, disablePadding: false, label: 'Manual'},
  {
    id: 'status', numeric: false, disablePadding: false, label: 'Status',
    labelRender: () => <Flag/>,
    // tslint:disable-next-line:no-any
    render: (dataItem: any) => {
      switch (dataItem.status) {
        case 'warnings':
          return tooltipHelper('Warnings', <Warning/>);
        case 'error':
          return tooltipHelper('Error', <RemoveCircle/>);
        case 'failure':
          return tooltipHelper('Failure', <Error/>);
        case 'timeout':
          return tooltipHelper('Timeout', <Timer/>);
        case 'completed':
          return tooltipHelper('Completed', <DoneAll/>);
        case 'service-failure':
          return tooltipHelper('Service failure', <Build/>);
        case 'terminated':
          return tooltipHelper('Done', <Done/>);
        case 'started':
          return tooltipHelper('Started', <PlayArrow/>);
        case 'retry':
          return tooltipHelper('Replay', <Replay/>);
        case 'dismissed':
          return tooltipHelper('Dismissed', <ExitToApp/>);
        default:
          return <div>{status}</div>;
      }
    }
  },
  {id: 'name', numeric: false, disablePadding: true, label: 'Name'},
  {id: 'runName', numeric: false, disablePadding: false, label: 'Machines'},
  {id: 'parameters.loopCount', numeric: true, disablePadding: false, label: 'Iterations', isObject: true},
  {id: 'parameters.concurrentUsers', numeric: true, disablePadding: false, label: 'Probes', isObject: true},
  {
    id: 'createDate', numeric: false, disablePadding: false, label: 'Time',
    // tslint:disable-next-line:no-any
    render: (dataItem: any) => dataItem.createDate
      ? moment(dataItem.createDate).format('MMM DD, YYYY - HH:mm')
      : 'never',
    style: {
      whiteSpace: 'nowrap'
    }
  },
  {id: 'textError', numeric: false, disablePadding: false, label: 'Reason'},
];

export class GridControl extends React.Component<ITestHistoryProps & ITestsHistoryDispatch & RouteComponentProps<{}> &
  WithStyles<'root'>, ITestHistoryState> {
  constructor(props: ITestHistoryProps & ITestsHistoryDispatch & RouteComponentProps<{}> & WithStyles<'root'>) {
    super(props);

    this.state = {
      filters: [],
      testRuns: [],
    };

    this.onRowClick = this.onRowClick.bind(this);
  }

  componentDidMount() {
    this.props.fetchTestsDistinct();
  }

  componentWillReceiveProps(nextProps: ITestHistoryProps) {
    if (nextProps.testRuns.length !== 0) {
      let testRunsFilter: Array<FilterValue> = [{value: '', label: 'Any test'}];
      nextProps.testRuns.map(tr => {
        let testRunFilterSingle: FilterValue = {value: tr, label: tr};
        testRunsFilter.push(testRunFilterSingle);
      });
      this.setState({
        testRuns: testRunsFilter,
      });
    }
  }

  onRowClick(e: React.MouseEvent<HTMLTableRowElement>, dataItem: GridModel) {
    this.props.history.push(`${TestRunDetails}/${dataItem._id}`);
  }

  render() {
    const {classes} = this.props;

    let statusFilterValues = [
      {value: '', label: 'Any Result'},
      {value: 'warnings', label: 'Warnings'},
      {value: 'error', label: 'Error'},
      {value: 'failure', label: 'Failure'},
      {value: 'timeout', label: 'Timeout'},
      {value: 'completed', label: 'Completed'},
      {value: 'service-failure', label: 'Service failure'},
      {value: 'terminated', label: 'Terminated'},
      {value: 'started', label: 'Started'},
      {value: 'retry', label: 'Retry'},
      {value: 'dismissed', label: 'Dismissed'},
    ];

    let createDateFilterValues = [
      {value: '', label: 'Any date'},
      {value: '0', label: 'Today'},
      {value: '7', label: 'Last 7 days'},
      {value: '30', label: 'Last 30 days'},
    ];

    return (
      <Paper className={classes.root}>
        <Grid
          onRowClick={this.onRowClick}
          search={true}
          remoteDataBound={true}
          searchByLabel={'name/machine'}
          apiRoute={ApiPath.api.testRuns}
          columnSchema={columnSchema}
          defaultSort={{
            order: 'asc',
            orderBy: 'createDate'
          }}
          filters={[
            {
              fieldName: 'status',
              filterValues: statusFilterValues,
              value: '',

            },
            {
              fieldName: 'name',
              filterValues: this.state.testRuns,
              value: '',
            },
            {
              fieldName: 'createDate',
              filterValues: createDateFilterValues,
              value: '',
            }
          ]}
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

const mapDispatchToProps = (dispatch: Dispatch<IStore>): ITestsHistoryDispatch => ({
  fetchTestsDistinct: () => dispatch(FetchTestsDistinct()),
});

const mapStateToProps = (state: IStore) => ({
  testRuns: state.dictionary.testRuns,
});

export default connect<ITestHistoryProps, ITestsHistoryDispatch>
(mapStateToProps, mapDispatchToProps)
(decorate<ITestHistoryProps & ITestsHistoryDispatch>(GridControl));