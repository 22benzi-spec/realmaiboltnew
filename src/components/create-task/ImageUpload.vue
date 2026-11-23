<template>
  <div
    ref="uploadRootRef"
    class="image-upload"
    tabindex="0"
    title="点击后可按 Ctrl+V 粘贴图片上传"
    @click="focusUploadRoot"
    @paste="handlePaste"
  >
    <div v-if="multiple">
    <!-- <a-image-preview-group v-if="multiple"> -->
      <a-upload
        v-model:file-list="fileList"
        :multiple="multiple"
        :max-count="maxCount"
        :accept="accept"
        :before-upload="beforeUpload"
        :custom-request="customRequest"
        :disabled="disabled"
        list-type="picture-card"
        :show-upload-list="true"
        @preview="handlePreview"
        @remove="handleRemove"
      >
        <div v-if="fileList.length < maxCount || maxCount === 0">
          <PlusOutlined />
          <div style="margin-top: 8px">上传</div>
        </div>
      </a-upload>
    </div>
    <!-- </a-image-preview-group> -->
    <a-upload
      v-else
      v-model:file-list="fileList"
      :multiple="multiple"
      :max-count="maxCount"
      :accept="accept"
      :before-upload="beforeUpload"
      :custom-request="customRequest"
      :disabled="disabled"
      list-type="picture-card"
      :show-upload-list="true"
      @preview="handlePreview"
      @remove="handleRemove"
    >
      <div v-if="fileList.length < maxCount || maxCount === 0">
        <PlusOutlined />
        <div style="margin-top: 8px">上传</div>
      </div>
    </a-upload>

    <!-- 隐藏的 a-image 用于预览 -->
    <a-image
      v-if="previewImage"
      :src="previewImage"
      :preview="{ visible: previewVisible, onVisibleChange: handleCancelPreview }"
      style="display: none"
    />
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { uploadCommonFile } from './dataSource'
const withApiPrefix = (url: string) => url
import type { UploadFile, UploadProps } from 'ant-design-vue'

interface Props {
  modelValue?: string | string[]
  initialFileList?: UploadFile[]
  multiple?: boolean
  maxCount?: number
  accept?: string
  maxSize?: number // MB
  disabled?: boolean
  captureDocumentPaste?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: string | string[]): void
  (e: 'change', fileList: UploadFile[]): void
  (e: 'file-change', file: UploadFile): void // 传递完整的 file 数据
  (e: 'upload-success', url: string): void
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => ([] as string | string[]),
  initialFileList: () => [],
  multiple: false,
  maxCount: 1,
  accept: 'image/*',
  maxSize: 10,
  disabled: false,
  captureDocumentPaste: false
})

const emit = defineEmits<Emits>()

const fileList = ref<UploadFile[]>([])
const previewVisible = ref(false)
const previewImage = ref('')
const uploadRootRef = ref<HTMLElement>()

const normalizeDisplayUrl = (url: string) => url.startsWith('/storage/') ? withApiPrefix(url) : url

const syncUploadedFile = (fileItem: UploadFile, responseData: any) => {
  const url = responseData?.url || ''

  if (!url) {
    console.error('上传成功但未获取到 URL:', responseData)
    message.error('上传成功但未获取到文件地址')
    return false
  }

  const displayUrl = normalizeDisplayUrl(url)
  Object.assign(fileItem, {
    ...responseData,
    url: displayUrl,
    thumbUrl: displayUrl,
    status: 'done' as const
  })

  emit('file-change', fileItem)
  emit('upload-success', displayUrl)
  updateModelValue()
  return true
}

// 初始化文件列表
const initFileList = () => {
  if (props.initialFileList && props.initialFileList.length > 0) {
    fileList.value = props.initialFileList.map(file => ({ ...file }))
    return
  }

  if (!props.modelValue) {
    fileList.value = []
    return
  }

  const values = Array.isArray(props.modelValue) ? props.modelValue : [props.modelValue]
  fileList.value = values
    .filter(v => v)
    .map((url, index) => ({
      uid: `-${index}-${Date.now()}`,
      name: url.split('/').pop() || `file-${index}`,
      status: 'done' as const,
      url: url,
      thumbUrl: url
    }))
}

// 监听 modelValue 变化
watch(() => [props.modelValue, props.initialFileList], () => {
  initFileList()
}, { immediate: true, deep: true })

const validateUploadFile = (file: File) => {
  // 检查文件大小
  if (props.maxSize && file.size / 1024 / 1024 > props.maxSize) {
    message.error(`文件大小不能超过 ${props.maxSize}MB`)
    return false
  }

  // 检查数量限制
  if (props.maxCount > 0 && fileList.value.length >= props.maxCount) {
    message.warning(`最多只能上传 ${props.maxCount} 个文件`)
    return false
  }

  return true
}

// 上传前的校验
const beforeUpload: UploadProps['beforeUpload'] = (file) => validateUploadFile(file as File)

const uploadPastedFile = async (file: File) => {
  if (!validateUploadFile(file)) return

  const uid = `paste-${Date.now()}-${Math.random().toString(36).slice(2)}`
  const uploadFile = {
    uid,
    name: file.name || `pasted-image-${Date.now()}.png`,
    status: 'uploading' as const,
    percent: 0,
    originFileObj: file
  } as UploadFile
  fileList.value.push(uploadFile)

  try {
    const response = await uploadCommonFile(file, (progressEvent) => {
      if (progressEvent.total) {
        uploadFile.percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
      }
    })

    if (response.code === 200) {
      if (!syncUploadedFile(uploadFile, response.data)) return
      message.success('上传成功')
    } else {
      uploadFile.status = 'error'
      message.error(response.message || response.msg || '上传失败')
    }
  } catch (error) {
    console.error('粘贴上传失败:', error)
    uploadFile.status = 'error'
    message.error('上传失败，请稍后重试')
  }
}

const handlePaste = (event: ClipboardEvent) => {
  if (props.disabled) return
  const files = Array.from(event.clipboardData?.files || []).filter(file => file.type.startsWith('image/'))

  if (!files.length) return
  event.preventDefault()
  files.slice(0, props.multiple ? files.length : 1).forEach(file => uploadPastedFile(file))
}

const focusUploadRoot = () => {
  uploadRootRef.value?.focus()
}

const handleDocumentPaste = (event: ClipboardEvent) => {
  if (!props.captureDocumentPaste || event.defaultPrevented) return
  handlePaste(event)
}

onMounted(() => {
  document.addEventListener('paste', handleDocumentPaste)
})

onBeforeUnmount(() => {
  document.removeEventListener('paste', handleDocumentPaste)
})

// 自定义上传请求
const customRequest: UploadProps['customRequest'] = async (options) => {
  const { file, onSuccess, onProgress } = options

  try {
    const response = await uploadCommonFile(file as File, (progressEvent) => {
      if (progressEvent.total) {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
        onProgress?.({ percent })
      }
    })

    if (response.code === 200) {
      // 更新文件列表中的 URL（确保列表中有对应项）
      const uid = (file as UploadFile).uid
      let fileItem = fileList.value.find(item => item.uid === uid)
      if (!fileItem) {
        fileItem = {
          uid,
          name: (file as UploadFile).name || 'file',
          status: 'done' as const
        } as UploadFile
        fileList.value.push(fileItem)
      }

      if (!syncUploadedFile(fileItem, response.data)) return
      onSuccess?.(response)
      message.success('上传成功')
    } else {
      const fileItem = fileList.value.find(item => item.uid === (file as UploadFile).uid)
      if (fileItem) {
        fileItem.status = 'error'
      }
      // 不调用 onError，避免 a-upload 组件显示 tooltip
      // onError?.(new Error(response.message || '上传失败'))
      message.error(response.message || response.msg || '上传失败')
    }
  } catch (error) {
    console.error('上传失败:', error)
    const fileItem = fileList.value.find(item => item.uid === (file as UploadFile).uid)
    if (fileItem) {
      fileItem.status = 'error'
    }
    // 不调用 onError，避免 a-upload 组件显示 tooltip
    // onError?.(error as Error)
    message.error('上传失败，请稍后重试')
  }
}

// 更新 modelValue
const updateModelValue = () => {
  const urls = fileList.value
    .filter(file => file.status === 'done' && file.url)
    .map(file => file.url) as string[]

  if (props.multiple) {
    emit('update:modelValue', urls)
  } else {
    emit('update:modelValue', urls[0] || '')
  }

  emit('change', fileList.value)
}

// 预览
const handlePreview = (file: UploadFile) => {
  // 获取预览图片的 URL，优先使用 thumbUrl，其次使用 url
  const imageUrl = file.thumbUrl || file.url || ''
  if (imageUrl) {
    previewImage.value = imageUrl
    // 使用 nextTick 确保 DOM 更新后再触发预览
    setTimeout(() => {
      previewVisible.value = true
    }, 0)
  } else {
    message.warning('无法预览该图片')
  }
}

// 关闭预览
const handleCancelPreview = (visible: boolean) => {
  previewVisible.value = visible
  if (!visible) {
    previewImage.value = ''
  }
}

// 删除
const handleRemove = (file: UploadFile) => {
  const index = fileList.value.findIndex(item => item.uid === file.uid)
  if (index > -1) {
    fileList.value.splice(index, 1)
    updateModelValue()
  }
}

</script>

<style scoped >
.image-upload :deep(.ant-upload-select-picture-card) {
  width: 104px;
  height: 104px;
}
.image-upload :deep(.ant-upload-list-picture-card) .ant-upload-list-item {
  width: 104px;
  height: 104px;
}
.image-upload :deep(.ant-upload-list-picture-card) .ant-upload-list-item-actions,
.image-upload :deep(.ant-upload-list-picture-card) .ant-upload-list-item-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.image-upload :deep(.ant-upload-list-picture-card) .ant-upload-list-item-actions a,
.image-upload :deep(.ant-upload-list-picture-card) .ant-upload-list-item-actions button,
.image-upload :deep(.ant-upload-list-picture-card) .ant-upload-list-item-actions a,
.image-upload :deep(.ant-upload-list-picture-card) .ant-upload-list-item-actions button {
  display: flex;
  align-items: center;
  justify-content: center;
}
.image-upload :deep(.ant-upload-list-picture-card) .ant-upload-list-item-actions .anticon,
.image-upload :deep(.ant-upload-list-picture-card) .ant-upload-list-item-actions .anticon {
  color: rgba(255, 255, 255, 0.85);
  font-size: 16px;
  cursor: pointer;
  transition: color 0.3s;
}
.image-upload :deep(.ant-upload-list-picture-card) .ant-upload-list-item-actions .anticon:hover,
.image-upload :deep(.ant-upload-list-picture-card) .ant-upload-list-item-actions .anticon:hover {
  color: #fff;
}
</style>