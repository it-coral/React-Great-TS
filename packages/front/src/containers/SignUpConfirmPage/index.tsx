import * as React from 'react';
import { Link } from 'react-router-dom';
import Grid from 'material-ui/Grid';
import Typography from 'material-ui/Typography';
import { Login as LoginRoutes } from '../../constants/RoutesNames';
import Button from 'material-ui/Button';
import { RouteComponentProps } from 'react-router';

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
                            <Link to={LoginRoutes.SignIn}>
                                <Button
                                    variant="raised"
                                >
                                    Back to login
                                </Button>
                            </Link>
                    </div>
                </Grid>
            </Grid>
        );
    }
}

export default SignUpConfirmPage;