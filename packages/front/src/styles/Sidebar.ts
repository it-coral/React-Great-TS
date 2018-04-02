export const ListItemTextStyle = {
    color: '#ADB0B7',
    textDecoration: 'none'
};

export const ListItemStyle = {
    height: 44,
    maxHeight: 44,
    padding: 0,
    '&:hover *': {
        color: '#FFFDFB'
    }
};

export const ListItemIconStyle = {
    color: '#ADB0B7',
};

export const ListLink = {
    boxSizing: 'border-box',
    width: '100%',
    height: '100%',
    padding: '14px 20px',
    textDecoration: 'none',
    borderLeft: '4px solid transparent',
    display: 'flex',
    alignItems: 'center'
} as React.CSSProperties;

export const ListLinkActive = {
    textDecoration: 'none',
    borderLeft: '4px solid rgb(81, 142, 69)'
};

export const ListItemStyleDisabled = {
    cursor: 'not-allowed'
};