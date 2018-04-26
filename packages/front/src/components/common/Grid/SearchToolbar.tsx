import * as React from 'react';
import { Theme, withStyles, WithStyles } from 'material-ui/styles';
import {
  TableCell,
} from 'material-ui/Table';
import TextField from 'material-ui/TextField';
import IconButton from 'material-ui/IconButton';
import { InputAdornment } from 'material-ui/Input';
import Search from '@material-ui/icons/Search';
import Cancel from '@material-ui/icons/Cancel';

type StyledComponent = WithStyles<
  'searchField' |
  'searchCell' |
  'searchBtn'
  >;

export interface SearchToolbarProps {
  value: string;
  placeholder: string;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onResetSearch: () => void;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

class SearchToolbar extends React.Component<SearchToolbarProps & StyledComponent> {
  render() {
    const {
      classes,
      onSearchChange,
      onResetSearch,
      onSubmit,
      placeholder,
      value
    } = this.props;
    return (
      <TableCell
        className={classes.searchCell}
      >
        <form onSubmit={onSubmit}>
          <TextField
            value={value}
            onChange={onSearchChange}
            className={classes.searchField}
            placeholder={placeholder}
            InputProps={{
              endAdornment: <InputAdornment position="end">
                {value   &&
                  <IconButton
                    className={classes.searchBtn}
                    aria-label="clear"
                    onClick={onResetSearch}
                  >
                    <Cancel />
                  </IconButton>}
                <IconButton
                  className={classes.searchBtn}
                  type="submit"
                  aria-label="search"
                >
                  <Search />
                </IconButton>
              </InputAdornment>
            }}
          />
        </form>
      </TableCell>
    );
  }
}

const styles = (theme: Theme) => ({
  searchField: {
    width: 245,
    marginRight: theme.spacing.unit
  },
  searchCell: {
    paddingRight: 0,
    minWidth: 373
  },
  searchBtn: {
    width: 30,
    height: 30
  }
} as React.CSSProperties);

const decorate = withStyles(styles);

export default decorate<SearchToolbarProps>(SearchToolbar);