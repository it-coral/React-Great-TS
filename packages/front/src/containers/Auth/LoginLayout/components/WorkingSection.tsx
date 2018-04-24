import * as React from 'react';
import { WithStyles } from 'material-ui/styles';
import withStyles from 'material-ui/styles/withStyles';

class WorkingSection extends React.Component<WithStyles<'root'>> {
    public render(): JSX.Element {
        const { classes, children } = this.props;
        return (
            <div className={classes.root}>
                {children}
            </div>
        );
    }
}

const styles = {
    root: {
        paddingTop: 25,
        height: 'calc(100% - 70px)',
        backgroundColor: '#F3F3F4',
        overflowX: 'hidden'
    } as React.CSSProperties
};

const decorate = withStyles(() => styles);

export default decorate<{}>(WorkingSection);