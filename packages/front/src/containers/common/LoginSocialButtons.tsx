import * as React from 'react';
import Grid from 'material-ui/Grid';
import Button from 'material-ui/Button';
import withStyles from 'material-ui/styles/withStyles';
import { WithStyles } from 'material-ui/styles';
import * as GOOGLE_IMAGE from '../../assets/socials/google.svg';
import FACEBOOK_IMAGE from '../../assets/socials/facebook.svg';
import LINKEDIN_IMAGE from '../../assets/socials/linkedin.svg';

class LoginSocialButtons extends React.Component<WithStyles<
    'buttonContainer' |
    'socialButtonRoot' |
    'socialButtonLabel' |
    'socialIcon'>> {
    public render(): JSX.Element {
        const { classes } = this.props;

        return (
            <Grid container={true}>
                <Grid
                    className={classes.buttonContainer}
                    item={true}
                    xs={4}
                >
                    <Button
                        classes={{
                            root: classes.socialButtonRoot,
                            label: classes.socialButtonLabel
                        }}
                    >
                        <img draggable={false} className={classes.socialIcon} src={GOOGLE_IMAGE} />
                    </Button>
                </Grid>
                <Grid
                    className={classes.buttonContainer}
                    item={true}
                    xs={4}
                >
                    <Button
                        classes={{
                            root: classes.socialButtonRoot,
                            label: classes.socialButtonLabel
                        }}
                    >
                        <img draggable={false} className={classes.socialIcon} src={FACEBOOK_IMAGE} />
                    </Button>
                </Grid>
                <Grid
                    className={classes.buttonContainer}
                    item={true}
                    xs={4}
                >
                    <Button
                        classes={{
                            root: classes.socialButtonRoot,
                            label: classes.socialButtonLabel
                        }}
                    >
                        <img draggable={false} className={classes.socialIcon} src={LINKEDIN_IMAGE} />
                    </Button>
                </Grid>
            </Grid>
        );
    }
}

const decorate = withStyles(theme => ({
    buttonContainer: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    socialButtonRoot: {
        padding: 0,
        color: '#fff',
        width: '50px',
        height: '50px',
        minWidth: '50px',
        minHeight: '50px'
    },
    socialButtonLabel: {
        width: '100%',
        height: '100%'
    },
    socialIcon: {
        width: '100%',
        height: '100%'
    }
} as React.CSSProperties));

export default decorate<{}>(LoginSocialButtons);