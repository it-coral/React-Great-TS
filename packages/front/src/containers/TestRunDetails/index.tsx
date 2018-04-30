import * as React from 'react';
import { AxiosResponse } from 'axios';
import { RouteComponentProps } from 'react-router';
import { Theme, WithStyles, withStyles } from 'material-ui/styles';
import { CircularProgress } from 'material-ui/Progress';
import Fade from 'material-ui/transitions/Fade';
import Grid from 'material-ui/Grid';
import TestStats from './components/TestStats';
import TestOverview from './components/TestOverview';
// import TestSessions from './components/TestSessions';
import AxiosFactory from '../../services/AxiosFactory';
import ApiPath from '../../constants/ApiPath';
import { Statuses } from '../../constants/TestStatus';
import * as moment from 'moment';

interface TestRunDetailsProps {
}

interface TestRunDetailsState {
  // tslint:disable-next-line:no-any
  data?: any;
  calc: {
    recv?: {
      packerErrorPCT: number;
      effectiveBitRate: number;
    };
    send?: {
      packerErrorPCT: number;
      effectiveBitRate: number;
    };
    testDuration?: number;
  };
  audioMOS?: number;
  audioMosPanelColor?: string;
  successRate?: string;
  // tslint:disable-next-line:no-any
  filtCusTestMetric?: any;
}

type StyledComponent = WithStyles<
  'circularProgress' |
  'detailsContainer'
  >;

class TestRunDetails extends React.Component<
  // tslint:disable-next-line:no-any
  TestRunDetailsProps & RouteComponentProps<any> & StyledComponent, TestRunDetailsState> {
  durationInterval: NodeJS.Timer;

  // tslint:disable-next-line:no-any
  constructor(props: TestRunDetailsProps & RouteComponentProps<any> & StyledComponent) {
    super(props);

    this.state = {
      data: null,
      calc: {}
    };
  }

  componentDidMount() {
    this.fetchItemValues();
  }

  fetchItemValues() {
    let axiosFactory = new AxiosFactory();
    return axiosFactory.axios.get(`${ApiPath.api.testRuns}/${this.props.match.params.objectId}`)
      .then((res: AxiosResponse) => {
        this.setState({
          data: res.data
        },            () => {
          this.durationInterval = setInterval(() => {
            this.setState({
              ...this.state,
              calc: {
                ...this.state.calc,
                testDuration: moment(new Date()).diff(moment(this.state.data.createDate))
              }
            });
          },                                  1000);
          this.processTestData();
          this.getAllTestIterations();
        });
        return res;
      });
  }

  processTestData() {
    const { data } = this.state;
    const newState: TestRunDetailsState = {
      calc: {}
    };
    const sRef = data.stat;
    const lastIter = Array.isArray(sRef) ? sRef[sRef.length - 1].stat : sRef;
    if (lastIter) {
      let condition = data.endDate || data.status === Statuses.timeout ||
        data.status === Statuses.completed || data.status === Statuses.serviceFailure;
      if (condition) {
        clearInterval(this.durationInterval);
      }
      let duration = moment(data.endDate).diff(moment(data.createDate));

      newState.filtCusTestMetric = {};
      newState.calc = {
        testDuration: duration,
        // looks like we lastIter is already test.stat.[send, recv]
        send: this.calcChannelStat(lastIter.send),
        recv: this.calcChannelStat(lastIter.recv)
      };

      if (lastIter.stat && lastIter.stat.customTestMetric) {
        for (let key in lastIter.stat.customTestMetric) {
          if (lastIter.stat.customTestMetric.hasOwnProperty(key)) {
            if (key === 'VoiceQuality:MOS') {
              newState.audioMOS = lastIter.stat.customTestMetric[key].value;
            }

            /*Filters out , voiceQuality:* records and creates new array*/
            if (key.substring(0, key.indexOf(':')) !== 'VoiceQuality') {
              newState.filtCusTestMetric[key] = lastIter.stat.customTestMetric[key];
            }
          }
        }
      }

      if (newState.audioMOS) {
        newState.audioMosPanelColor = this.getAudioMosPanelClass(newState.audioMOS);
      }

      this.setState({
        ...this.state,
        ...newState
      });
    }
  }

  getAllTestIterations() {
    let axiosFactory = new AxiosFactory();
    axiosFactory.axios.get(`${ApiPath.api.testIterations}/${this.props.match.params.objectId}/all`)
      .then(({ data }) => {
        // tslint:disable-next-line:no-any
        let success = data.filter((iter: any) => iter.status === 'completed' || iter.status === 'warnings');
        let total = data.length;
        let rate = Math.ceil(success.length / total * 100);

        if (!isNaN(rate)) {
          this.setState({
            successRate: `${rate}% (${success.length}/${total})`
          });
        }
      });
  }

  // tslint:disable-next-line:no-any
  calcChannelStat(stat: any) {
    return {
      packerErrorPCT: stat.packetLoss * 100 / stat.totalPackets || 0,
      effectiveBitRate: stat.bytes / stat.voiceDuration
    };
  }

  getAudioMosPanelClass(value: number) {
    switch (true) {
      case (value >= 3):
        return '#559542';
      case (value >= 2 && value < 3):
        return '#F1CD2B';
      case (value < 2):
        return '#A22A21';
      default: return '';
    }
  }

  render() {
    const { classes } = this.props;
    return (
      <React.Fragment>
        {!this.state.data ?
          <CircularProgress className={classes.circularProgress} size={80} /> :
          <Fade in={true}>
            <Grid
              container={true}
              spacing={16}
              className={classes.detailsContainer}
            >
              <TestStats
                data={this.state.data}
                calc={this.state.calc}
              />
              <TestOverview
                data={this.state.data}
                calc={this.state.calc}
                successRate={this.state.successRate}
                audioMosPanelColor={this.state.audioMosPanelColor}
              />
            </Grid>
          </Fade>
        }
      </React.Fragment>
    );
  }
}
const styles = (theme: Theme) => ({
  circularProgress: {
    position: 'fixed',
    transform: 'translate(-50%, -50%)',
    left: '50%',
    top: '50%'
  },
  detailsContainer: {
    maxWidth: 860,
    width: '100%',
    marginLeft: 'auto',
    marginRight: 'auto'
  }
}) as React.CSSProperties;

const decorate = withStyles(styles);

// tslint:disable-next-line:no-any
export default decorate<TestRunDetailsProps & RouteComponentProps<any>>(TestRunDetails);