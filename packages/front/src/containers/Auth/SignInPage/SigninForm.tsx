import * as React from 'react';
// import Grid from 'material-ui/Grid';
// import { Field, Form } from 'react-final-form';
import Button from 'material-ui/Button';
import { withStyles, WithStyles } from 'material-ui/styles';
// import { Link } from 'react-router-dom';
// import Typography from 'material-ui/Typography';
// import Email from '@material-ui/icons/Email';
// import Lock from '@material-ui/icons/Lock';
import { RouteComponentProps, withRouter } from 'react-router';
// import TextFieldControl from '../../../components/common/form-elements/TextFieldControl';
// import FormValidators from '../../../helpers/form-validators';
import AuthService from '../../../services/AuthService';
import Auth0Service from '../../../services/Auth0Service';

// import { Main, Login as LoginRoutes } from '../../../constants/RoutesNames';
import { Main } from '../../../constants/RoutesNames';

interface ILoginForm {
  email: string;
  password: string;
}

interface ILoginFormError {
  message: string;
}

type StyledComponent = WithStyles<
  'signInButton' |
  'buttonContainer' |
  'formContainer' |
  'forgotPasswordContainer' |
  'link' |
  'linkText' |
  'fieldIconContainer' |
  'formSection'
  >;

class SigninForm extends React.Component<RouteComponentProps<{}> & StyledComponent> {
  auth: AuthService;
  auth0: Auth0Service;

  constructor(props: RouteComponentProps<{}> & StyledComponent) {
    super(props);

    this.auth = new AuthService();
    this.onSubmit = this.onSubmit.bind(this);
    this.auth0 = new Auth0Service();
    this.onSignInAuth0 = this.onSignInAuth0.bind(this);
  }

  componentDidMount() {
    if (this.auth.loggedIn()) {
      this.props.history.push(Main);
    }
  }
  onSignInAuth0() {

    this.auth0.login();
  }
  public render(): JSX.Element {

    const { classes } = this.props;
    return (
          <Button
            type="button"
            variant="raised"
            color="primary"
            className={classes.signInButton}
            onClick={this.onSignInAuth0}
          >
            Sign in with Auth0
          </Button>
    );
  }

  private onSubmit(values: ILoginForm): Promise<void | { [x: string]: string; }> {
    return this.auth.login(values.email, values.password)
      .then(() => {
        this.props.history.push('/app/main');
      })
      .catch((err: ILoginFormError) => {
        return { password: err.message };
      });
  }
}

const decorate = withStyles(theme => ({
  formSection: {
    padding: `${theme.spacing.unit}px 0`
  },
  fieldIconContainer: {
    display: 'flex',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    opacity: 0.4
  },
  buttonContainer: {
    display: 'flex',
    justifyContent: 'flex-end'
  },
  forgotPasswordContainer: {
    display: 'flex',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  signInButton: {
    width: 'auto'
  },
  formContainer: {
    paddingTop: theme.spacing.unit * 10
  },
  link: {
    textDecoration: 'none',
    '&:hover': {
      textDecoration: 'underline'
    },
    '&:active': {
      textDecoration: 'none'
    }
  },
  linkText: {
    color: '#559542',
  }
} as React.CSSProperties));

export default withRouter<RouteComponentProps<{}>>(decorate<RouteComponentProps<{}>>(SigninForm));