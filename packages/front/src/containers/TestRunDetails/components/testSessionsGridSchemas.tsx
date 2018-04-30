import * as React from 'react';
import Tooltip from 'material-ui/Tooltip';
import { testStatusHelper, tooltipHelper } from '../../../helpers/testStatusHelper';
import IconButton from 'material-ui/IconButton';
import { TestIteration } from '../../../constants/RoutesNames';
import OpenInNew from '@material-ui/icons/OpenInNew';

export const groupedSchema = (groupedColumnLabel: string): Array<ColumnSchema> => {
  return [
    {
      id: 'group', numeric: false, disablePadding: false, label: groupedColumnLabel, sortable: false,
      // tslint:disable-next-line:no-any
      render: (dataItem: any) =>
        (
          <Tooltip
            placement="right"
            title={(dataItem.group !== undefined) ? dataItem.group : ''}
          >
            <span>{dataItem.group}</span>
          </Tooltip>
        ),
    },
    {
      id: 'count', numeric: false, disablePadding: false, label: 'Count',  sortable: false,
    },
    {
      id: 'rank', numeric: false, disablePadding: false, label: 'Average Rank',  sortable: false,
    }
  ];
};

export const unGroupedColumnSchema = (hoverClass: string): Array<ColumnSchema> => {
  return [
    {
      id: 'statusId,machine,runIndex', numeric: false, disablePadding: false, label: 'Status',
      style: {maxWidth: '5%', padding: '0px 15px 0px 20px'},
      render: (dataItem: any) => { // tslint:disable-line
        return testStatusHelper(dataItem.status);
      }
    },
    {
      id: 'runIndex,machine', numeric: false, disablePadding: false, label: 'Itr',
      style: {maxWidth: '10%', padding: '0px 5px'},
      render: (dataItem: any) => ( // tslint:disable-line
        <span>{`${dataItem.runIndex}`}</span>
      ),
    },
    {
      id: 'machine,runIndex', numeric: false, disablePadding: false, label: 'Probe',
      style: {maxWidth: '15%', padding: '0px 5px'},
      render: (dataItem: any) => { // tslint:disable-line
        return (
          <div style={{minWidth: '70px'}}>
          <Tooltip
            title={(dataItem.machine !== undefined) ? dataItem.machine : ''}
            placement="right"
          >
           <span>{(dataItem.machine !== undefined) ? dataItem.machine.match(/\d+$/)[0] : ''}</span>
          </Tooltip>
          <span style={{marginLeft: '5px'}}>
              {tooltipHelper('Open link in new tab', <IconButton
                className={hoverClass}
                onClick={(e: React.MouseEvent<HTMLElement>) => {
                  window.open(`${TestIteration}/${dataItem._id}`, '_blank');
                  e.stopPropagation();
                }}
              >
                <OpenInNew/>
              </IconButton>)}
          </span>
        </div>
        );
      }
    },
    {
      id: 'runIndex,machine', numeric: false, disablePadding: false, label: 'Session',
      style: {maxWidth: '10%', padding: '0px 5px'},
      render: (dataItem: any) => ( // tslint:disable-line
        <span>{`${dataItem.inSessionIdx}: ${dataItem.sessionSize} | ${dataItem.sessionIdx}`}</span>
      ),
    },
    {
      id: 'networkProfile,runIndex,machine', numeric: false, disablePadding: false, label: 'Network',
      style: {maxWidth: '15%', padding: '0px 5px'},
      render: (dataItem: any) => ( // tslint:disable-line
        <span>{`${dataItem.networkProfile}`}</span>
      ),
    },
    {
      id: 'firewallProfile', numeric: false, disablePadding: false, label: 'Firewall',
      style: {maxWidth: '15%', padding: '0px 10px'},
    },
    {
      id: 'browser,runIndex,machine', numeric: false, disablePadding: false, label: 'Browser',
      style: {maxWidth: '15%', padding: '0px 10px'},
      render: (dataItem: any) => ( // tslint:disable-line
        <span>{`${dataItem.browser}`}</span>
      ),
    },
    {
      id: 'location,runIndex,machine', numeric: false, disablePadding: false, label: 'Location',
      style: {maxWidth: '15%', padding: '0px 10px'},
      render: (dataItem: any) => ( // tslint:disable-line
        <span>{`${dataItem.location}`}</span>
      ),
    }
  ];
};
