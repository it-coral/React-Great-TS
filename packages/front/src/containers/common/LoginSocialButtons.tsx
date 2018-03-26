import * as React from 'react';
import Grid from 'material-ui/Grid';
import Button from 'material-ui/Button';
import withStyles from 'material-ui/styles/withStyles';
import { WithStyles } from 'material-ui/styles';

class LoginSocialButtons extends React.Component<WithStyles<'socialButton' |
    'googleButton' |
    'facebookButton' |
    'linkedInButton'>> {
    public render(): JSX.Element {
        const {classes} = this.props;

        return (
            <Grid item={true} xs={12}>
                <Button
                    variant="raised"
                    className={`${classes.socialButton} ${classes.googleButton}`}
                >
                    Sign in with Google
                </Button>
                <Button
                    variant="raised"
                    className={`${classes.socialButton} ${classes.facebookButton}`}
                >
                    Sign in with Facebook
                </Button>
                <Button
                    variant="raised"
                    className={`${classes.socialButton} ${classes.linkedInButton}`}
                >
                    Sign in with LinkedIn
                </Button>
            </Grid>
        );
    }
}

const decorate = withStyles((theme) => ({
    socialButton: {
        marginBottom: theme.spacing.unit,
        color: '#fff',
        width: '100%'
    },
    googleButton: {
        background: '#CF3D2E',
    },
    facebookButton: {
        background: '#3C599F',
    },
    linkedInButton: {
        background: '#0085AE',
    },
}));

export default decorate<{}>(LoginSocialButtons);