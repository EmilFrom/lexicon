if (__DEV__) {
    require("./reactotronConfig.js");
  }
import { registerRootComponent } from 'expo';

import App from './App';

registerRootComponent(App);
