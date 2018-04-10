import * as React from 'react';
import Dialog, {
    DialogContent,
    DialogContentText,
    DialogTitle,
} from 'material-ui/Dialog';
import Slide from 'material-ui/transitions/Slide';

// tslint:disable-next-line:no-any
function Transition(props: any) {
    return <Slide direction="up" {...props} />;
}

interface IRemindPasswordModalProps {
    isOpen: boolean;
    emailRemind: string;
    onClose: (() => void);
}

class RemindPasswordModal extends React.Component<IRemindPasswordModalProps> {
    public render(): JSX.Element {
        return (
            <Dialog
                open={this.props.isOpen}
                transition={Transition}
                keepMounted={true}
                onClose={this.props.onClose}
                aria-labelledby="alert-dialog-slide-title"
                aria-describedby="alert-dialog-slide-description"
            >
                <DialogTitle id="alert-dialog-slide-title">
                    Password Reset
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="alert-dialog-slide-description">
                        Instructions for accessing your account have been sent to {this.props.emailRemind}
                    </DialogContentText>
                </DialogContent>
            </Dialog>
        );
    }
}

export default RemindPasswordModal;