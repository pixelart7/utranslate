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
          | dev
    .p-4
      Dropzone(@add="fileAdd")
    .text-gray-100.text-xs.flex.border-b.border-gray-800(
      v-for="file in list"
      :class="{'bg-gray-700': $route.params.fsKey === 'utranslate-file-' + file}"
    )
      button.px-4.py-2.w-full.text-left.flex-1(
        @click=`$router.push({
          name: 'Editor',
          params: { fsKey: 'utranslate-file-' + file }
        }).catch(() => {})`
        class="hover:bg-gray-800 focus:outline-none transition-colors duration-200"
      )
        | {{file}}
      button.w-8(
        class="hover:bg-red-500 focus:outline-none transition-colors duration-200"
        @click="deleteFile(file)"
      ) ×
  .w-64
  .flex-1
    router-view
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';

import Dropzone from '@/components/Dropzone.vue';
import useFiles from '@/use/useFiles';
import useRouter from '@/use/useRouter';

const List = defineComponent({
  setup() {
    const { importFile, list, refreshList } = useFiles();
    const { router } = useRouter();

    async function fileAdd(file: File) {
      const newFileName = await importFile(file);
      console.log(newFileName);
      console.log(list.value);
    }

    function deleteFile(filename: string) {
      console.log(filename);
      localStorage.removeItem(`utranslate-file-${filename}`);
      localStorage.removeItem(`utranslate-json-${filename}`);
      localStorage.removeItem(`utranslate-companion-${filename}`);
      refreshList();
      router.replace({ name: 'List' });
    }

    return {
      fileAdd,
      list,
      deleteFile,
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
