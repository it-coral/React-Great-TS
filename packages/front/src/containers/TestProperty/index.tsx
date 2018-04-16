import * as React from 'react';
import TestPropertyForm from './TestPropertyForm';
import { AxiosResponse } from 'axios';
import AxiosFactory from '../../services/AxiosFactory';
import ApiPath from '../../constants/ApiPath';
import { Tests } from '../../constants/RoutesNames';
import { RouteComponentProps } from 'react-router';
import { NewTestProperty } from '../../constants/RoutesNames';

interface TestParameters {
  concurrentUsers: number;
  duration: number;
  iterationMode: 'string';
  loopCount: number;
}

interface TestProfile {
  browser: string;
  firewall: string;
  location: string;
  media: string;
  network: string;
}

interface TestPropertyProps {
}

interface TestPropertyState {
  // TODO: remove any
  // tslint:disable-next-line:no-any
  userConfig: any;
  newMode: boolean;
  // tslint:disable-next-line:no-any
  initialValues: any;
}

export interface ITestPropertyForm {
  _id: string;
  name: string;
  info?: string;
  parameters: TestParameters;
  testProfiles: Array<TestProfile>;
  project: string;
  runOptions: string;
  createDate: string;
  serviceUrl: string;
}

export default class TestProperty extends React.Component<
  // tslint:disable-next-line:no-any
  TestPropertyProps & RouteComponentProps<any>, TestPropertyState> {
  // tslint:disable-next-line:no-any
  constructor(props: TestPropertyProps & RouteComponentProps<any>) {
    super(props);

    this.state = {
      newMode: true,
      userConfig: null,
      initialValues: {
        testProfiles: [{
          browser: 'linux-chrome-stable',
          location: 'any',
          network: 'No throttling',
          firewall: 'FW_NO_FW',
          media: 'KrankyGeek-2-1080p'
        }]
      }
    };

    this.onSubmit = this.onSubmit.bind(this);
  }

  componentDidMount() {
    this.setState({
      newMode: this.props.location.pathname.includes(NewTestProperty)
    },            () => {
      this.fetchItemValues();
      this.fetchUserConfig();
    });
  }

  fetchItemValues() {
    let axiosFactory = new AxiosFactory();
    return axiosFactory.axios.get(`${ApiPath.api.testDefinitions}/${this.props.match.params.objectId}`)
      .then((res: AxiosResponse) => {
        this.setState({
          initialValues: res.data
        });
    });
  }

  fetchUserConfig() {
    let axiosFactory = new AxiosFactory();
    return axiosFactory.axios.get(ApiPath.api.userConfig).then((res: AxiosResponse) => {
      this.setState({
        userConfig: res.data
      });
    });
  }

  render() {
    return (
      <React.Fragment>
        {
          this.state.userConfig && <TestPropertyForm
            onSubmit={this.onSubmit}
            {...this.state}
          />
        }
      </React.Fragment>
    );
  }

  private onSubmit(values: ITestPropertyForm) {
    let axiosFactory = new AxiosFactory();
    return axiosFactory.axios({
      url: this.state.newMode ? `${ApiPath.api.testDefinitions}` : `${ApiPath.api.testDefinitions}/${values._id}`,
      method: this.state.newMode ? 'POST' : 'PUT',
      data: {
        ...values,
        browserType: 'Chrome'
      }
    }).then(() => {
      this.props.history.push(Tests);
    });
  }
}