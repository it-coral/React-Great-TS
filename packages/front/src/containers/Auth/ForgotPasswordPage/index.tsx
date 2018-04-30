import * as React from 'react';
import Grid from 'material-ui/Grid';
import Typography from 'material-ui/Typography';
import { RouteComponentProps } from 'react-router';
import ForgotPasswordForm from '../ForgotPasswordPage/ForgotPasswordForm';

class ForgotPasswordPage extends React.Component<RouteComponentProps<{}>> {
  public render(): JSX.Element {
    return (
      <Grid
        container={true}
        direction="row"
        justify="center"
      >
        <Grid item={true} xs={4}>
          <Typography variant={`title`}>Forgot your password?</Typography>
          <br />
          <Typography>Enter your email address to reset your password.
              You may need to check your spam folder or unblock support@testrtc.com..
          </Typography>
          <br />
          <ForgotPasswordForm />
        </Grid>
      </Grid>
    );
  }
}

export default ForgotPasswordPage;