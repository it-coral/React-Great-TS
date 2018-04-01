import * as React from 'react';
import withAuth from '../../components/common/auth/withAuth';

class Main extends React.Component {
    render() {
        return (
            <div>
                <h1>Main Dashboard</h1>
            </div>
        );
    }
}

export default withAuth(Main);