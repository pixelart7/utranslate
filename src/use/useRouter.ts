import { Location } from 'vue-router';
import { computed, getCurrentInstance } from '@vue/composition-api';

const QUERY_SYNC_PREFIX = 'qs_';

export default function useRouter(persistQueries?: string[]) {
  const vm = getCurrentInstance();

  if (!vm) {
    throw new ReferenceError('Not found vue instance.');
  }

  const route = computed(() => vm.$route);

  function processPersistQueries(inputLocation: Location): Location {
    if (!persistQueries || persistQueries.length === 0) {
      console.warn('Try to persist query without any variables');
      return inputLocation;
    }
    const location = inputLocation;
    if (!vm) {
      throw new ReferenceError('Not found vue instance.');
    }
    const toPersist: { [key: string]: any } = {};
    persistQueries.forEach((query) => {
      if (query in route.value.query) toPersist[query] = route.value.query[query];
      else if (`${QUERY_SYNC_PREFIX}${query}` in route.value.query) {
        toPersist[`${QUERY_SYNC_PREFIX}${query}`] = route.value.query[`${QUERY_SYNC_PREFIX}${query}`];
      }
    });
    if (!('query' in location)) location.query = {};
    location.query = {
      ...location.query,
      ...toPersist,
    };
    return location;
  }

  const persistQuery = {
    push(inputLocation: Location) {
      const location = processPersistQueries(inputLocation);
      vm.$router.push(location);
    },
    replace(inputLocation: Location) {
      const location = processPersistQueries(inputLocation);
      vm.$router.replace(location);
    },
  };

  const routerPersist = {
    query: persistQuery,
  };

  return {
    route,
    router: vm.$router,
    routerPersist,
    QUERY_SYNC_PREFIX,
  };
}
