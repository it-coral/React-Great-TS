import * as React from 'react';
import { Statuses } from '../constants/TestStatus';
import Tooltip from 'material-ui/Tooltip';
import Build from '@material-ui/icons/Build';
import Done from '@material-ui/icons/Done';
import ExitToApp from '@material-ui/icons/ExitToApp';
import Replay from '@material-ui/icons/Replay';
import PlayArrow from '@material-ui/icons/PlayArrow';
import RemoveCircle from '@material-ui/icons/RemoveCircle';
import Warning from '@material-ui/icons/Warning';
import Cancel from '@material-ui/icons/Cancel';
import Error from '@material-ui/icons/Error';
import Timer from '@material-ui/icons/Timer';

export const tooltipHelper = (title: string, icon: React.ReactElement<React.ReactNode>): React.ReactNode => {
  return <Tooltip placement="top" title={title}>{icon}</Tooltip>;
};

export function testStatusHelper(status: string): React.ReactNode {
    switch (status) {
      case Statuses.warnings:
        return tooltipHelper('Warnings', <Warning style={{ color: '#F1CD2B' }}/>);
      case Statuses.error:
        return tooltipHelper('Error', <RemoveCircle style={{ color: '#a22a21' }}/>);
      case Statuses.failure:
        return tooltipHelper('Failure', <Error style={{ color: '#A22A21' }}/>);
      case Statuses.timeout:
        return tooltipHelper('Timeout', <Timer style={{ color: '#c4c4c4' }}/>);
      case Statuses.completed:
        return tooltipHelper('Completed', <Done style={{ color: '#559542' }}/>);
      case Statuses.serviceFailure:
        return tooltipHelper('Service failure', <Build style={{ color: '#c4c4c4' }}/>);
      case Statuses.terminated:
        return tooltipHelper('Terminated', <Cancel style={{ color: '#676A6C' }}/>);
      case Statuses.started:
        return tooltipHelper('Started', <PlayArrow style={{ color: '#c4c4c4' }}/>);
      case Statuses.retry:
        return tooltipHelper('Retry', <Replay style={{ color: '#c4c4c4' }}/>);
      case Statuses.dismissed:
        return tooltipHelper('Dismissed', <ExitToApp style={{ color: '#c4c4c4' }}/>);
      default:
        return <span>{status}</span>;
    }
}
