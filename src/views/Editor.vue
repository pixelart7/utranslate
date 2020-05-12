<template lang="pug">
.editor
  template(v-if="Object.keys(file).length > 0")
    .sticky.top-0.h-20.flex.bg-blue-700.items-center
      .p-2
        span.rounded-lg.bg-blue-600.py-1.px-2.text-white original size
        p.text-lg.px-1.text-white {{file.originalSize}} bytes
      .p-2
        span.rounded-lg.bg-blue-600.py-1.px-2.text-white words
        p.text-lg.px-1.text-white {{file.wordPairs.length}}
      .p-2
        span.rounded-lg.py-1.px-2.text-white.transition-colors.duration-200(
          :class=`{
            'bg-red-900': currentSize !== file.originalSize,
            'bg-blue-600': currentSize === file.originalSize,
          }`
        ) current size
        p.text-lg.px-1.text-white
          | {{currentSize}} bytes
          span.ml-2(v-if="currentSize !== file.originalSize")
            | (
            | &nbsp;
            template(v-if="currentSize - file.originalSize > 0") +
            | {{currentSize - file.originalSize}}
            | )
      .flex.flex-1.justify-end.items-center.px-2
        div.mx-1
          input.h-8.rounded-lg.border.border-gray-200.px-2.mr-1.w-40.text-left.my-2(
            type="string" v-model="companionInput" placeholder="Companion File"
          )
          button.px-3.py-1.rounded-lg.bg-gray-200.text-gray-900.transition-colors.duration-200(
            class="hover:bg-gray-300"
            @click='setCompanion'
          ) Set
        .border-r.border-blue-800.mx-4.h-6
        div
          button.px-3.py-1.rounded-lg.bg-gray-200.text-gray-900(
            class="hover:bg-gray-300 transition-colors transition-opacity duration-200"
            @click="exportFile"
          ) Export
        .border-r.border-blue-800.mx-4.h-6
        p.pr-2.text-white.font-mono.text-xs.text-right(v-if="lastSave !== ''")
          | {{lastSave.toTimeString().substring(0, 8)}}
        div
          button.px-3.py-1.rounded-lg.bg-gray-200.text-gray-900(
            class="hover:bg-gray-300 transition-colors transition-opacity duration-200"
            @click="save"
          ) Save
    .p-4
      .my-1(v-for="(wp, i) in file.wordPairs")
        .flex
          .w-12 {{i+1}}
          .w-64.mx-2.break-all
            p(v-if="Object.keys(companionFile).length > 0")
              | {{ companionFile.wordPairs[i].wordText }}
            p.text-xs.text-gray-400 {{ wp.keyText }}
          .flex-1.mx-2
            input.w-full.h-8.flex.items-center.rounded-lg.border.border-gray-200.px-2.mr-1(
              type="text" :value="wp.wordText" @input="setWordText($event, i)"
            )
            p.px-1.text-sm.text-mono.text-gray-400
              | {{ hex(wp.word, (wp.encoding === 'ascii')? 2 : 4) }}
          .w-40.flex
            button.h-8.px-3.py-1.rounded-lg.rounded-tr-none.rounded-br-none(
              tabindex="-1"
              @click="wp.encoding = 'ascii'; reComputeSize(i)"
              class="focus:outline-none transition-colors duration-20"
              :class=`{
                'bg-blue-400 text-white': wp.encoding === 'ascii',
                'bg-gray-200 text-gray-900': wp.encoding !== 'ascii'
                }`
            ) ascii
            button.h-8.px-3.py-1.rounded-lg.rounded-tl-none.rounded-bl-none(
              tabindex="-1"
              @click="wp.encoding = 'unicode'; reComputeSize(i)"
              class="focus:outline-none transition-colors duration-20"
              :class=`{
                'bg-blue-400 text-white': wp.encoding === 'unicode',
                'bg-gray-200 text-gray-900': wp.encoding !== 'unicode'
                }`
            ) unicode
          div.text-xs.font-mono(style="flex: 2;")
            p.text-gray-400
              | original position: {{ wp.position.from }} - {{ wp.position.to }} (exclusive)
            p.text-gray-400
              | original word size: {{ wp.size.word }} bytes
            //- p.text-gray-400 key hex: {{ hex(wp.key) }}
  template(v-else)
    .h-screen.w-full.flex.items-center.justify-center.flex-col
      label Set offset to first translation key
      input.h-8.rounded-lg.border.border-gray-200.px-2.mr-1.w-64.text-center.my-2(
        type="number" v-model.number="offsetInput"
      )
      button.px-3.py-1.rounded-lg.bg-gray-200.text-gray-900.transition-colors.duration-200(
        class="hover:bg-gray-300"
        @click='setOffset'
      ) Set
</template>

<script lang="ts">
/* eslint-disable */

import {
  defineComponent, computed, ref, Ref, onMounted, reactive, watch,
} from '@vue/composition-api';

import { Buffer } from 'buffer';

import useFiles from '@/use/useFiles';
import useRouter from '@/use/useRouter';

type FileJSON = {
  header: string;
  footer: string;
  originalSize: number;
  wordPairs: {
    next: number;
    key: string;
    word: string;
    encoding: string;
    position: {
      from: number;
      to: number;
    };
    size: {
      key: number;
      word: number;
      tail: number;
      total: number;
    };
    wordText: string;
    keyText: string;
  }[];
};

const Editor = defineComponent({
  setup(props) {
    const lastSave: Ref<string | Date> = ref('');
    const saving = ref(false);
    const filepath = ref('');

    const { parser, getFile, hasFile, saveFile, converter, downloadFile } = useFiles();
    const { route } = useRouter();

    let file = ref({} as FileJSON);
    let companionFile = ref({} as FileJSON);

    const offset = ref(-1);
    const offsetInput = ref(0);

    function obtainFile() {
      const fn = route.value.params.fsKey?.replace('utranslate-file-', '');
      if (hasFile(route.value.params.fsKey)) {
        if (hasFile(`utranslate-json-${fn}`)) {
          const json = JSON.parse(getFile(`utranslate-json-${fn}`));
          file.value = json as FileJSON;
        } else {
          if (offset.value !== -1) {
            saveFile(
              `utranslate-json-${fn}`,
              JSON.stringify(parser.uasset(Buffer.from(getFile(route.value.params.fsKey) as string, 'hex'), offset.value))
            )
            file.value = JSON.parse(getFile(`utranslate-json-${fn}`)) as FileJSON;
          }
        }
      }
    }

    const companion = ref('');
    const companionInput = ref('');

    function obtainCompanion() {
      const companionFileName = localStorage.getItem(route.value.params.fsKey?.replace('utranslate-file-', 'utranslate-companion-'));
      if (companionFileName) {
        if (hasFile(companionFileName)) companionFile.value = JSON.parse(getFile(companionFileName));
      }
    }

    function setCompanion() {
      companion.value = `utranslate-json-${companionInput.value}`;
      localStorage.setItem(route.value.params.fsKey?.replace('utranslate-file-', 'utranslate-companion-'), companion.value);
      obtainCompanion();
    }

    function setOffset() {
      offset.value = offsetInput.value;
      try {
        obtainFile();
      } catch (e) {
        console.error('seems to have an error when parsing');
      }
    }

    watch(route, () => {
      file.value = {} as FileJSON;
      companionFile.value = {} as FileJSON;
      offset.value = -1;
      offsetInput.value = 0;
      companion.value = '';
      companionInput.value = '';
      obtainFile();
      obtainCompanion();
    }, { deep: true });

    const currentSize = computed(() => {
      let checkWordPairsSize = 0;
      file.value.wordPairs.forEach((elm) => {
        checkWordPairsSize += (elm.key.length / 2) + (elm.word.length / 2) + 4 + 4 + (elm.size.tail);
      });
      return (file.value.header.length / 2) + (file.value.footer.length / 2) + checkWordPairsSize;
    });

    function reComputeSize(index: number) {
      file.value.wordPairs[index].word = Buffer
        .from(file.value.wordPairs[index].wordText, (file.value.wordPairs[index].encoding === 'ascii') ? 'ascii' : 'utf16le')
        .toString('hex');
      if (file.value.wordPairs[index].encoding === 'ascii') file.value.wordPairs[index].word = `${file.value.wordPairs[index].word}00`; // not so sure about this but found a lot ASCII with 00 padding
    }

    function setWordText(event: Event, index: number) {
      file.value.wordPairs[index].wordText = (event.target as any).value;
      reComputeSize(index);
    }

    onMounted(() => {
      document.onkeyup = (e) => {
        if ((e.ctrlKey || e.metaKey) && e.which === 83) {
          console.log('save');
          e.preventDefault();
          return false;
        }
      };
    });

    function save() {
      localStorage.setItem(
        route.value.params.fsKey?.replace('utranslate-file-', 'utranslate-json-'),
        JSON.stringify(file.value),
      )
      lastSave.value = new Date();
    }

    function exportFile() {
      save();
      const hex = converter.uasset(file.value);
      // const original = getFile(route.value.params.fsKey);
      // console.log(original.length);
      // console.log(hex.length);
      // console.log('---');
      // const hexArr = hex.split('');
      // original.split('').forEach((char, index) => {
      //   const res = char === hexArr[index];
      //   if (!res) {
      //     console.log('index', index, '; original', char, '; hex', hexArr[index]);
      //   }
      // });
      // console.log(hex === original);
      downloadFile(Buffer.from(hex, 'hex'), route.value.params.fsKey?.replace('utranslate-file-', 'edited-'));
    }

    return {
      companionFile,
      companionInput,
      setCompanion,
      lastSave,
      saving,
      save,
      filepath,
      reComputeSize,
      setWordText,
      currentSize,
      file,
      offsetInput,
      setOffset,
      exportFile,
      hex(string: string, group = 2) {
        if (group === 2) return (string.match(/.{2}/g) || ['']).join(' ');
        return (string.match(/.{4}/g) || ['']).join(' ');
      },
    };
  },
});

export default Editor;
</script>

<style lang="scss">
// .editor {}
</style>
