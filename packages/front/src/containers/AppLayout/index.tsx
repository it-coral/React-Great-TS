import * as React from 'react';
import { Route } from 'react-router-dom';
import MenuBar from './components/MenuBar';

export default class AppLayout extends React.Component {
    render() {
        return (
            <Route path="/app">
               <React.Fragment>
                   <MenuBar />
                   <div>
                       {this.props.children}
                   </div>
               </React.Fragment>
            </Route>
        );
    }
}