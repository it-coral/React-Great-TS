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
import Tooltip from 'material-ui/Tooltip';
import { connect, Dispatch } from 'react-redux';
import { FetchTestsDistinct } from '../../actions/dictionaryAction';
import IconButton from 'material-ui/IconButton';
import OpenInNew from '@material-ui/icons/OpenInNew';
import { Statuses } from '../../constants/TestStatus';

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

const tooltipHelper = (title: string, icon: React.ReactElement<React.ReactNode>): React.ReactNode => {
  return <Tooltip placement="top" title={title}>{icon}</Tooltip>;
};

type StyledComponent = WithStyles<
  'root' |
  'tableRowItemHover' |
  'hoverActionBtnStyle'
  >;

export class GridControl extends React.Component<ITestHistoryProps & ITestsHistoryDispatch & RouteComponentProps<{}> &
  StyledComponent, ITestHistoryState> {

  columnSchema: Array<ColumnSchema> = [
    {
      id: 'manual', numeric: false, disablePadding: false, label: 'Manual',
      style: { maxWidth: '5%' },
      // tslint:disable-next-line:no-any
      render: (dataItem: any) => { return (dataItem.manual !== 0) ? dataItem.manual : ''; }
    },
    {
      id: 'status', numeric: false, disablePadding: false, label: 'Status', style: { maxWidth: '5%', padding: '0px' },
      labelRender: () => <Flag />,
      // tslint:disable-next-line:no-any
      render: (dataItem: any) => {
        switch (dataItem.status) {
          case Statuses.warnings:
            return tooltipHelper('Warnings', <Warning style={{ color: '#F1CD2B' }} />);
          case Statuses.error:
            return tooltipHelper('Error', <RemoveCircle style={{ color: '#a22a21' }} />);
          case Statuses.failure:
            return tooltipHelper('Failure', <Error style={{ color: '#A22A21' }} />);
          case Statuses.timeout:
            return tooltipHelper('Timeout', <Timer style={{ color: '#c4c4c4' }} />);
          case Statuses.completed:
            return tooltipHelper('Completed', <DoneAll style={{ color: '#559542' }} />);
          case Statuses.serviceFailure:
            return tooltipHelper('Service failure', <Build style={{ color: '#c4c4c4' }} />);
          case Statuses.terminated:
            return tooltipHelper('Done', <Done style={{ color: '#559542' }} />);
          case Statuses.started:
            return tooltipHelper('Started', <PlayArrow style={{ color: '#c4c4c4' }} />);
          case Statuses.retry:
            return tooltipHelper('Replay', <Replay style={{ color: '#c4c4c4' }} />);
          case Statuses.dismissed:
            return tooltipHelper('Dismissed', <ExitToApp style={{ color: '#c4c4c4' }} />);
          default:
            return <div>{dataItem.status}</div>;
        }
      }
    },
    {
      id: 'name', numeric: false, disablePadding: true, label: 'Name', style: { maxWidth: '35%' },
      render: (dataItem: any) => ( // tslint:disable-line
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pointerEvents: 'none'
          }}
        >
          <span>{dataItem.name}</span>
          <div>
            {tooltipHelper('Open link in new tab', <IconButton
              className={this.props.classes.hoverActionBtnStyle}
              onClick={(e: React.MouseEvent<HTMLElement>) => {
                window.open(`${TestRunDetails}/${dataItem._id}`, '_blank');
                e.stopPropagation();
              }}
            >
              <OpenInNew />
            </IconButton>)}
          </div>
        </div>
      )
    },
    {
      id: 'runName', numeric: false, disablePadding: false, label: 'Machines',
      style: { maxWidth: '15%', padding: '0px 5px' }
    },
    {
      id: 'parameters.loopCount', numeric: true, disablePadding: false, label: 'Iterations', isObject: true,
      style: { maxWidth: '10%', padding: '0px 5px' }
    },
    {
      id: 'parameters.concurrentUsers', numeric: true, disablePadding: false, label: 'Probes', isObject: true,
      style: { maxWidth: '10%', padding: '0px 5px' }
    },
    {
      id: 'createDate', numeric: false, disablePadding: false, label: 'Time',
      // tslint:disable-next-line:no-any
      render: (dataItem: any) => dataItem.createDate
        ? moment(dataItem.createDate).format('MMM DD, YYYY - HH:mm')
        : 'never',
      style: {
        whiteSpace: 'nowrap',
        maxWidth: '10%',
        padding: '0px 10px'
      }
    },
    {
      id: 'textError', numeric: false, disablePadding: false, label: 'Reason',
      style: { maxWidth: '25%', wordWrap: 'break-word' }
    },
  ];

  constructor(props: ITestHistoryProps & ITestsHistoryDispatch & RouteComponentProps<{}> & StyledComponent) {
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
      let testRunsFilter: Array<FilterValue> = [{ value: '', label: 'Any test' }];
      nextProps.testRuns.map(tr => {
        let testRunFilterSingle: FilterValue = { value: tr, label: tr };
        testRunsFilter.push(testRunFilterSingle);
      });
      this.setState({
        testRuns: testRunsFilter,
      });
    }
  }

  onRowClick(e: React.MouseEvent<HTMLTableRowElement>, dataItem: GridModel) {
    console.log("onRowClick", e); // tslint:disable-line
    this.props.history.push(`${TestRunDetails}/${dataItem._id}`);
  }

  render() {
    const { classes } = this.props;

    let statusFilterValues = [
      { value: '', label: 'Any Result' },
      { value: Statuses.warnings, label: 'Warnings' },
      { value: Statuses.error, label: 'Error' },
      { value: Statuses.failure, label: 'Failure' },
      { value: Statuses.timeout, label: 'Timeout' },
      { value: Statuses.completed, label: 'Completed' },
      { value: Statuses.serviceFailure, label: 'Service failure' },
      { value: Statuses.terminated, label: 'Terminated' },
      { value: Statuses.started, label: 'Started' },
      { value: Statuses.retry, label: 'Retry' },
      { value: Statuses.dismissed, label: 'Dismissed' },
    ];

    let createDateFilterValues = [
      { value: '', label: 'Any date' },
      { value: '0', label: 'Today' },
      { value: '7', label: 'Last 7 days' },
      { value: '30', label: 'Last 30 days' },
    ];

    return (
      <Paper className={classes.root}>
        <Grid
          onRowClick={this.onRowClick}
          search={true}
          remoteDataBound={true}
          searchByLabel={'name/machine'}
          apiRoute={ApiPath.api.testRuns}
          columnSchema={this.columnSchema}
          defaultSort={{
            order: 'desc',
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
          rowProps={{
            className: classes.tableRowItemHover
          }}
        />
      </Paper>
    );
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