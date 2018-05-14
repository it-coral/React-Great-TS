import * as React from 'react';
import { RouteComponentProps } from 'react-router';
import Grid from 'material-ui/Grid';
import { Main } from '../../../constants/RoutesNames';
import Auth0Service from '../../../services/Auth0Service';

class CallbackPage extends React.Component<RouteComponentProps<{}>> {
    auth0: Auth0Service;

    constructor(props: RouteComponentProps<{}>) {
        super(props);
        this.auth0 = new Auth0Service();
    }

    componentDidMount() {
      this.auth0.setAccessToken();
      this.auth0.setIdToken();
      this.props.history.push(Main);
    }

    public render(): JSX.Element {
        return (
            <Grid
                container={true}
                direction="row"
                justify="center"
            >
                Loading ...             
            </Grid>
        );
    }
}

export default CallbackPage;