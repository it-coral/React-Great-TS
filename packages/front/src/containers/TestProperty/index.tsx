import * as React from 'react';
import TestPropertyForm from './TestPropertyForm';

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

interface ITestPropertyForm {
    name: string;
    info?: string;
    parameters: TestParameters;
    testProfiles: Array<TestProfile>;
    project: string;
    runOptions: string;
    createDate: string;
    serviceUrl: string;
}

export default class TestProperty extends React.Component<{}> {
    constructor(props: {}) {
        super(props);

        this.onSubmit = this.onSubmit.bind(this);
    }

    render() {
        return (
            <React.Fragment>
                <TestPropertyForm
                    onSubmit={this.onSubmit}
                />
            </React.Fragment>
        );
    }

    // private onSubmit(values: ITestPropertyForm): Promise<void | { [x: string]: string; }> {
    //     return this.auth.login(values.email, values.password)
    //         .then(() => {
    //             this.props.history.push('/app/main');
    //         })
    //         .catch((err: ILoginFormError) => {
    //             return { password: err.message };
    //         });
    // }
    // tslint:disable-next-line:no-any
    private onSubmit(values: ITestPropertyForm) {
        // tslint:disable-next-line:no-debugger
        debugger;
    }
}