import * as React from 'react';
import { Theme, withStyles, WithStyles } from 'material-ui/styles';
import Toolbar from 'material-ui/Toolbar';
import Button from 'material-ui/Button';
import { RouteComponentProps, withRouter } from 'react-router';
import { NewTestProperty } from '../../constants/RoutesNames';

type StyledComponent = WithStyles<
    'root' |
    'newTestButton'
>;

export class GridControl extends React.Component<RouteComponentProps<{}> & StyledComponent> {
    constructor(props: RouteComponentProps<{}> & StyledComponent) {
        super(props);

        this.toNewTestDefinition = this.toNewTestDefinition.bind(this);
    }

    toNewTestDefinition() {
        this.props.history.push(NewTestProperty);
    }

    render() {
        const { classes } = this.props;

        return (
            <Toolbar className={classes.root}>
                <Button
                    variant="raised"
                    color="default"
                    disabled={true}
                >
                    Save
                </Button>
                <Button
                    variant="raised"
                    className={classes.newTestButton}
                    onClick={this.toNewTestDefinition}
                >
                    Create New Test
                </Button>
            </Toolbar>
        );
    }
}

const styles = (theme: Theme) => ({
    root: {
        justifyContent: 'flex-end'
    },
    newTestButton: {
        color: 'white',
        backgroundColor: '#559542',
        marginLeft: theme.spacing.unit * 2,
        '&:hover': {
            backgroundColor: '#518E45',
        }
    }
} as React.CSSProperties);

const decorate = withStyles(styles);

export default withRouter<RouteComponentProps<{}>>(decorate<RouteComponentProps<{}>>(GridControl));