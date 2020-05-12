<template lang="pug">
.common-dropzone
  //- .fixed.inset-0.bg-secondary-800.z-40.pointer-events-none.transition-opacity.duration-100(
    :class="{'opacity-75': isDragging, 'opacity-0': !isDragging}"
  //- )
  form.relative
    vueDropzone.h-full.cursor-pointer(
      :class="{'is-dragging absolute inset-0 z-50': isDragging}"
      :id="'common-dropzone-inner-' + _uid"
      :options="dropzoneOptions"
      :useCustomSlot="true"
      @vdropzone-drop="handleFileDrop"
      @vdropzone-drag-over="isHovering = true"
      @vdropzone-drag-leave="isHovering = false"
      @vdropzone-file-added="handleFileAdd"
      @vdropzone-upload-progress="handleUploadProgress"
      @vdropzone-success="handleUploadProgress"
      @vdropzone-error="quickDebug"
    )
      .flex.items-center.flex-col
        p +
        .text-white(v-if="!isHovering")
          | Drag here to add
          br
          small.opacity-75 (or click to browse...)
        .text-white(v-else)
          | Release to add
</template>

<script lang="ts">
import {
  defineComponent,
  reactive,
  onMounted,
  onUnmounted,
  ref,
  computed,
} from '@vue/composition-api';

import vue2Dropzone from 'vue2-dropzone';
import 'vue2-dropzone/dist/vue2Dropzone.min.css';


type Vue2DropzoneFile = {
  status: string;
  upload: { progress: number; bytesSent: number };
}

const CommonDropzone = defineComponent({
  setup(props, context) {
    const dropzoneOptions = reactive({
      url: '/',
      maxFilesize: 5,
      createImageThumbnails: false,
      autoProcessQueue: false,
      // accept(f: File & Vue2DropzoneFile, done: () => {}) {
      //   console.log(f);
      // },
    });

    const isDragging = ref(false);
    const isHovering = ref(false);

    const fileBuffer = ref({} as File & Vue2DropzoneFile);
    const fileStatus = reactive({
      status: '',
      name: '',
      bytes: '',
      progressPercentage: '',
      progressBytes: '',
    });

    function isDraggingFile(e: DragEvent) {
      if (e && e.dataTransfer) {
        const dt = e.dataTransfer;
        if (dt.types && dt.types.indexOf('Files') !== -1) {
          return true;
        }
      }
      return false;
    }

    function handleDragInDocument(e: DragEvent) {
      if (isDraggingFile(e)) isDragging.value = true;
    }

    function handleDragOutDocument(e: DragEvent) {
      if (isDraggingFile(e) && e.x === 0 && e.y === 0) isDragging.value = false;
    }

    function handleUploadProgress(f: File & Vue2DropzoneFile) {
      fileBuffer.value = f;
      fileStatus.status = fileBuffer.value.status;
      fileStatus.name = fileBuffer.value.name;
      // fileStatus.bytes = fileBuffer.value.size;
      fileStatus.progressPercentage = fileBuffer.value.upload.progress.toFixed(2);
      // fileStatus.progressBytes = fileBuffer.value.upload.bytesSent;
    }

    function handleFileAdd(f: File & Vue2DropzoneFile) {
      // handleUploadProgress(f);
      // console.log(f);
      // console.log('file add');
      context.emit('add', f);
    }

    function handleFileDrop() {
      isDragging.value = false;
      isHovering.value = false;
    }

    const isFileActive = computed(() => 'status' in fileBuffer.value);
    // TODO: emit events
    const isUploadFinished = computed(() => parseInt(fileStatus.progressPercentage, 10) >= 100);

    onMounted(() => {
      window.addEventListener('dragover', handleDragInDocument);
      window.addEventListener('dragleave', handleDragOutDocument);
    });

    onUnmounted(() => {
      window.removeEventListener('dragover', handleDragInDocument);
      window.removeEventListener('dragleave', handleDragOutDocument);
    });

    return {
      dropzoneOptions,
      isDragging: false, // TODO: fix fixed position bug, some others relative element still appear
      isHovering,
      handleUploadProgress,
      handleFileDrop,
      isFileActive,
      isUploadFinished,
      fileStatus,
      handleFileAdd,
    };
  },
  components: {
    vueDropzone: vue2Dropzone,
  },
  methods: {
    // TODO: implement error handling
    quickDebug(e: any) {
      console.log(e);
    },
  },
});

export default CommonDropzone;
</script>

<style lang="scss">
.common-dropzone {
  .dropzone {
    font-family: unset;
    @apply bg-transparent border-dashed rounded-lg flex justify-center items-center;
    &.is-dragging {
      @apply bg-blue-800;
    }
    .dz-message {
      @apply m-0 block;
    }
    &:hover {
      background-color: rgba(#000, 0.15);
    }
    .dz-preview {
      @apply hidden;
    }
  }
}
</style>
