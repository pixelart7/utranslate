import Vue from 'vue';
import VueComposition from '@vue/composition-api';

import App from './App.vue';
// import './registerServiceWorker';
import router from './router';
import store from './store';

Vue.config.productionTip = false;

Vue.use(VueComposition);

new Vue({
  router,
  store,
  render: (h) => h(App),
}).$mount('#app');
