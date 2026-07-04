import { registerRootComponent } from 'expo';
import notifee, { EventType } from '@notifee/react-native';
import App from './App';


// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
registerRootComponent(App);
