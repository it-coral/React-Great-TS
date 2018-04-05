import * as React from 'react';
import TestPropertyForm from './TestPropertyForm';
import { AxiosResponse } from 'axios';
import * as H from 'history';
import AxiosFactory from '../../services/AxiosFactory';
import ApiPath from '../../constants/ApiPath';
import { Tests } from '../../constants/RoutesNames';

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
  history: H.History;
}

interface TestPropertyState {
  // TODO: remove any
  // tslint:disable-next-line:no-any
  userConfig: any;
}

export interface ITestPropertyForm {
  name: string;
  info?: string;
  parameters: TestParameters;
  testProfiles: Array<TestProfile>;
  project: string;
  runOptions: string;
  createDate: string;
  serviceUrl: string;
}

export default class TestProperty extends React.Component<TestPropertyProps, TestPropertyState> {
  constructor(props: TestPropertyProps) {
    super(props);

    this.state = {
      userConfig: null
    };

    this.onSubmit = this.onSubmit.bind(this);
  }

  componentDidMount() {
    this.fetchUserConfig();
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
    const { userConfig } = this.state;

    return (
      <React.Fragment>
        {
          userConfig && <TestPropertyForm
            onSubmit={this.onSubmit}
            userConfig={userConfig}
          />
        }
      </React.Fragment>
    );
  }

  private onSubmit(values: ITestPropertyForm) {
    let axiosFactory = new AxiosFactory();
    return axiosFactory.axios.post(ApiPath.api.testDefinitions, {
      ...values,
      browserType: 'Chrome'
    }).then(() => {
      this.props.history.push(Tests);
    });
  }
}