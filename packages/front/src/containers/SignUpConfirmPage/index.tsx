import * as React from 'react';
import { Link } from 'react-router-dom';
import Grid from 'material-ui/Grid';
import Typography from 'material-ui/Typography';

class SignUpConfirmPage extends React.Component {
    public render(): JSX.Element {
        return (
            <Grid
                container={true}
                direction="row"
                justify="center"
            >
                <Grid item={true} xs={6}>
                    <div>
                        <Typography variant={`title`}>Thanks for signing up.</Typography>
                        <br/>
                        <Typography>We have sent a verification link to your email address mulyoved@gmail.com.
                            Please follow the instruction in your email.
                        </Typography>
                        <br/>
                        <Typography>
                            <Link to="/signin">Back to login</Link>
                        </Typography>
                    </div>
                </Grid>
            </Grid>
        );
    }
}

export default SignUpConfirmPage;