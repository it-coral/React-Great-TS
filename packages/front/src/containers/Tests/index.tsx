import * as React from 'react';
import GridControl from './GridControl';

export default class Tests extends React.Component {
    render() {
        return (
            <React.Fragment>
                <GridControl {...this.props} />
            </React.Fragment>
        );
    }
}