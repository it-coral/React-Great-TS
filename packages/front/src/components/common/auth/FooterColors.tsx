import * as React from 'react';
import { WithStyles } from 'material-ui/styles';
import withStyles from 'material-ui/styles/withStyles';

class FooterColors extends React.Component<WithStyles<'root' | 'yellow' | 'green' | 'orange' | 'blue' | 'red'>> {
    public render(): JSX.Element {
        const {classes} = this.props;

        return (
            <div className={classes.root}>
                <div className={classes.yellow}/>
                <div className={classes.green}/>
                <div className={classes.orange}/>
                <div className={classes.blue}/>
                <div className={classes.red}/>
            </div>
        );
    }
}

const commonStyle = {
    width: '20%',
    position: 'relative',
    display: 'inline-flex',
};

const styles = {
    root: {
        position: 'absolute',
        bottom: 0,
        width: '100%',
        left: 0,
        display: 'block',
        alignItems: 'flex-end',
        height: '13px',
    } as React.CSSProperties,
    yellow: {
        ...commonStyle,
        background: '#f1cd2b',
        height: '13px',
    } as React.CSSProperties,
    green: {
        ...commonStyle,
        background: '#599647',
        height: '11px',
        width: '20%',
    } as React.CSSProperties,
    orange: {
        ...commonStyle,
        background: '#dd7127',
        height: '9px',
    } as React.CSSProperties,
    blue: {
        ...commonStyle,
        background: '#3577c1',
        height: '7px',
    } as React.CSSProperties,
    red: {
        ...commonStyle,
        background: '#a22a21',
        height: '12px',
    } as React.CSSProperties,
};

const decorate = withStyles(() => styles);

export default decorate<{}>(FooterColors);