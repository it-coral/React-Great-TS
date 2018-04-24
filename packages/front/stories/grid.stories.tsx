import * as React from 'react';
import { storiesOf, RenderFunction } from '@storybook/react';
import ThemeProvider from '../src/testHelpers/ThemeProvider';
import { Grid } from '../src/components/common/Grid';
// import ApiPath from '../src/constants/ApiPath';

const columnSchema: Array<ColumnSchema> = [
  { id: 'Column1', numeric: false, disablePadding: false, label: 'Column 1' },
  { id: 'Column2', numeric: false, disablePadding: true, label: 'Sortable Column 2', sortable: false },
  { id: 'Column3', numeric: true, disablePadding: false, label: 'Column 3' },
  { id: 'Column4', numeric: true, disablePadding: false, label: 'Column 4' }
];

const customRenderColumn = {
  id: 'Column4', numeric: false, disablePadding: false, label: 'Column 4',
  render: (data: any) => <strong>{data}</strong>,
  style: {
    textDecoration: 'underline'
  }
};

const SampleData = [{
  _id: 1,
  Column1: "Sample name",
  Column2: "Some info",
  Column3: 654,
  Column4: "text"
}];

storiesOf('Grid', module)
  .addDecorator((story: RenderFunction) => <ThemeProvider story={story()} />)
  .add('Grid', () =>
    <Grid
      columnSchema={columnSchema}
    />)
  .add('Grid with row click handler', () =>
    <Grid
      onRowClick={() => alert("click")}
      columnSchema={columnSchema}
    />)
  .add('Grid with Search', () =>
    <Grid
      search={true}
      searchByLabel={'search label'}
      columnSchema={columnSchema}
    />)
  .add('Local data grid', () =>
    <Grid
      localData={SampleData}
      columnSchema={columnSchema}
    />)
  .add('Custom column renderer', () =>
    <Grid
      localData={SampleData}
      columnSchema={[customRenderColumn]}
    />);
