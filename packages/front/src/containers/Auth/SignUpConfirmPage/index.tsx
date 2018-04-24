import * as React from 'react';
import { RouteComponentProps } from 'react-router';
import Grid from 'material-ui/Grid';
import Typography from 'material-ui/Typography';
import Button from 'material-ui/Button';
import { Login as LoginRoutes } from '../../../constants/RoutesNames';

interface IRouterProps {
    email: string;
}

class SignUpConfirmPage extends React.Component<RouteComponentProps<IRouterProps>> {
    public render(): JSX.Element {
        return (
            <Grid
                container={true}
                direction="row"
                justify="center"
            >
                <Grid item={true} xs={6}>
                    <div>
                        <Typography variant={`title`}>Thanks for signing up!</Typography>
                        <br/>
                        <Typography>We have sent a verification link to your email address <strong>
                            {this.props.match.params.email}</strong>.
                            <br/>
                            Please follow the instruction in your email.
                        </Typography>
                        <br/>

                                <Button
                                    variant="raised"
                                    onClick={() => this.props.history.push(LoginRoutes.SignIn)}
                                >
                                    Back to login
                                </Button>
                    </div>
                </Grid>
            </Grid>
        );
    }
}

export default SignUpConfirmPage;