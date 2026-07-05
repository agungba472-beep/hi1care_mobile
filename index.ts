import { registerRootComponent } from 'expo';
import notifee, { EventType } from '@notifee/react-native';
import App from './App';

notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type === EventType.DELIVERED) {
    console.log('Alarm delivered in background:', detail.notification?.id);
  }
});

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
registerRootComponent(App);
