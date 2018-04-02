import * as React from 'react';
import withStyles from 'material-ui/styles/withStyles';
import { Theme, WithStyles } from 'material-ui/styles';

class AppContent extends React.Component<WithStyles<'content' | 'toolbar'>> {
    public render(): JSX.Element {
        const { classes } = this.props;
        return (
            <main className={classes.content}>
                <div className={classes.toolbar} />
                {this.props.children}
            </main>
        );
    }
}

const styles = (theme: Theme) => ({
    toolbar: theme.mixins.toolbar,
    content: {
        flexGrow: 1,
        backgroundColor: theme.palette.background.default,
        padding: theme.spacing.unit * 3,
    },
} as React.CSSProperties);

const decorate = withStyles(styles);

export default decorate<{}>(AppContent);