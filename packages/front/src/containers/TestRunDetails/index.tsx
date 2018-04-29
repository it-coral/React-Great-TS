import * as React from 'react';
import { AxiosResponse } from 'axios';
import { RouteComponentProps } from 'react-router';
import TestStats from './components/TestStats';
// import TestOverview from './components/TestOverview';
// import TestSessions from './components/TestSessions';
import AxiosFactory from '../../services/AxiosFactory';
import ApiPath from '../../constants/ApiPath';

interface TestRunDetailsProps {
}

interface TestRunDetailsState {
}

export default class TestRunDetails extends React.Component<
  // tslint:disable-next-line:no-any
  TestRunDetailsProps & RouteComponentProps<any>, TestRunDetailsState> {
  // tslint:disable-next-line:no-any
  constructor(props: TestRunDetailsProps & RouteComponentProps<any>) {
    super(props);
  }

  componentDidMount() {
    this.fetchItemValues();
  }

  fetchItemValues() {
    let axiosFactory = new AxiosFactory();
    return axiosFactory.axios.get(`${ApiPath.api.testRuns}/${this.props.match.params.objectId}`)
      .then((res: AxiosResponse) => {
        // debugger;
      });
  }

  render() {
    return (
      <React.Fragment>
        <TestStats />
        {/* <TestOverview />
        <TestSessions /> */}
      </React.Fragment>
    );
  }
}