<template lang="pug">
.list.h-screen.flex
  .w-64.bg-gray-900.fixed.top-0.bottom-0.left-0.overflow-y-auto.h-screen
    .px-4.pt-4
      p.font-mono.text-white utranslate (idev)
      p.font-mono.text-sm.text-gray-500
        | github:&nbsp;
        a.underline(
          class="hover:text-gray-600"
          href="https://github.com/pixelart7/utranslate" target="_blank"
        )
          | project
        | ,&nbsp;
        a.underline(
          class="hover:text-gray-600"
          href="https://github.com/pixelart7" target="_blank"
        )
          |dev
    .p-4
      Dropzone(@add="fileAdd")
    .text-gray-100.text-xs(v-for="file in list")
      button.px-4.py-2.border-b.border-gray-800.w-full.text-left.transition-colors.duration-200(
        @click=`$router.push({
          name: 'Editor',
          params: { fsKey: 'utranslate-file-' + file }
        }).catch(() => {})`
        class="hover:bg-gray-800 focus:outline-none"
        :class="{'bg-gray-700': $route.params.fsKey === 'utranslate-file-' + file}"
      )
        | {{file}}
  .w-64
  .flex-1
    router-view
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';

import Dropzone from '@/components/Dropzone.vue';
import useFiles from '@/use/useFiles';

const List = defineComponent({
  setup() {
    const { importFile, list } = useFiles();

    async function fileAdd(file: File) {
      const newFileName = await importFile(file);
      console.log(newFileName);
      console.log(list.value);
    }

    return {
      fileAdd,
      list,
    };
  },
  components: {
    Dropzone,
  },
});

export default List;
</script>

<style lang="scss">
// .list {}
</style>
