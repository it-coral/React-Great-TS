import * as React from 'react';
import { Link } from 'react-router-dom';
import Grid from 'material-ui/Grid';
import Paper from 'material-ui/Paper';
import TextField from 'material-ui/TextField';

interface LoginPageProps {
    test: string;
}

class SignInPage extends React.Component<LoginPageProps> {
    public render(): JSX.Element {
        return (
            <div>
                <h1>SignIn page</h1>
                <Link to={'/sign-up'}>Go to sign-up page</Link>
                <Grid container={true}>
                    <Grid item={true} xs={12}>
                        <Grid
                            container={true}
                            alignItems="center"
                            direction="row"
                            justify="center"
                        >
                            <Paper elevation={4}>
                                <Grid container={true}>
                                    <Grid item={true} xs={12}>
                                        <TextField
                                            id="uncontrolled"
                                            label="Login"
                                            margin="normal"
                                        />
                                    </Grid>
                                    <Grid item={true} xs={12}>
                                        <TextField
                                            id="uncontrolled"
                                            label="Password"
                                            margin="normal"
                                        />
                                    </Grid>
                                </Grid>
                            </Paper>
                        </Grid>
                    </Grid>
                </Grid>
            </div>
        );
    }
}

export default SignInPage;