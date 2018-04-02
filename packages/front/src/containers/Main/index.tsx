import * as React from 'react';
import withAuth from '../../components/common/auth/withAuth';
import { connect, Dispatch } from 'react-redux';
import { FetchUser } from '../../actions/authAction';
import { CircularProgress } from 'material-ui/Progress';

interface IMainDispatch {
    authorize(): void;
}

interface IMainProps {
    user: User;
}

class Main extends React.Component<IMainProps & IMainDispatch> {
    componentDidMount() {
        this.props.authorize();
    }

    render() {
        if (this.props.user === null) {
            return (
                <CircularProgress size={80}/>
            );
        }

        return (
            <div>
                <h1>Main Dashboard</h1>
            </div>
        );
    }
}

const mapDispatchToProps = (dispatch: Dispatch<IStore>): IMainDispatch => {
    return {
        authorize: () => dispatch(FetchUser()),
    };
};

const mapStateToProps = (state: IStore) => ({
    user: state.userAuth.user,
});

export default withAuth(connect(mapStateToProps, mapDispatchToProps)(Main));