if (__DEV__) {
    require("./ReactotronConfig.js");
  }
import { registerRootComponent } from 'expo';

import App from './App';

registerRootComponent(App);
