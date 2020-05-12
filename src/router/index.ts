import Vue from 'vue';
import VueRouter, { RouteConfig } from 'vue-router';
import Home from '../views/Home.vue';
import List from '../views/List.vue';
import Editor from '../views/Editor.vue';

Vue.use(VueRouter);

const routes: Array<RouteConfig> = [
  {
    path: '/',
    // name: 'Home',
    // component: Home,
    redirect: { name: 'List' },
  },
  {
    path: '/editor',
    component: List,
    children: [
      {
        path: '',
        name: 'List',
      },
      {
        path: ':fsKey',
        name: 'Editor',
        component: Editor,
      },
    ],
  },
];

const router = new VueRouter({
  routes,
});

export default router;
