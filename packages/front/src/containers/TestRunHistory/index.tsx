import * as React from 'react';
import GridControl from './GridControl';

export default class TestRunHistory extends React.Component {
    render() {
        return (
            <React.Fragment>
                <GridControl {...this.props} />
            </React.Fragment>
        );
    }
}