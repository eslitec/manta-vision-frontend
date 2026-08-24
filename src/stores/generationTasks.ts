import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '@/api'
import { i18n } from '@/lang'
import type { GenerationTask, GeneratedImage, VideoJobReq } from '@/types/api'

let seq = 0
const uid = () => `imgtask_${Date.now()}_${++seq}`

// 背景生成任務：跨頁面（圖生圖／圖生影共用），不綁在任何頁面元件的生命週期上，
// 使用者離開頁面後任務仍持續在背景輪詢，驅動頂部工具列「任務」徽章與任務中心面板。
export const useGenerationTasksStore = defineStore('generationTasks', () => {
  const tasks = ref<GenerationTask[]>([])
  const toast = ref<{ taskId: string; title: string; message: string; kind: 'done' | 'failed' } | null>(null)
  const timers = new Map<string, number>()

  const activeCount = computed(
    () => tasks.value.filter((t) => t.status === 'pending' || t.status === 'processing').length,
  )
  const unreadCount = computed(
    () => tasks.value.filter((t) => (t.status === 'done' || t.status === 'failed') && !t.read).length,
  )

  function showToast(task: GenerationTask, kind: 'done' | 'failed') {
    const t = i18n.global.t
    toast.value = {
      taskId: task.id,
      title: kind === 'done' ? t('generationToast.videoDone') : t('generationToast.videoFailed'),
      message:
        kind === 'done'
          ? t('generationToast.saved', { name: task.name })
          : t('generationToast.failed', { name: task.name }),
      kind,
    }
  }
  function dismissToast() {
    toast.value = null
  }

  function clearTimer(id: string) {
    const t = timers.get(id)
    if (t) {
      clearInterval(t)
      timers.delete(id)
    }
  }

  function poll(taskId: string) {
    const timer = window.setInterval(async () => {
      const t = tasks.value.find((x) => x.id === taskId)
      if (!t) return clearTimer(taskId)
      const j = await api.getVideoJob(taskId)
      t.status = j.status
      // mock：processing 期間讓進度平滑往上爬（真實後端應回傳實際百分比）
      t.progress = Math.max(0, Math.min(100, j.progress))
      if (j.status === 'done') {
        clearTimer(taskId)
        t.progress = 100
        t.doneAt = Date.now()
        t.read = false
        showToast(t, 'done')
      } else if (j.status === 'failed') {
        clearTimer(taskId)
        t.error = j.error
        t.doneAt = Date.now()
        t.read = false
        showToast(t, 'failed')
      }
    }, 1000)
    timers.set(taskId, timer)
  }

  // 影片生成：送出後立刻回傳 taskId，呼叫端可選擇性記錄用於本頁預覽，但任務本身不受頁面卸載影響
  async function createVideoTask(req: VideoJobReq, name: string): Promise<string> {
    const job = await api.createVideoJob(req)
    const task: GenerationTask = {
      id: job.id,
      kind: 'video',
      name,
      status: job.status,
      progress: job.progress,
      cost: job.cost,
      read: true,
      createdAt: Date.now(),
      videoReq: req,
    }
    tasks.value.unshift(task)
    poll(task.id)
    return task.id
  }

  // 圖生圖：mock 目前是同步完成，包一層只是讓任務紀錄／通知／任務中心跟影片走同一條路徑
  async function createImageTask(
    run: () => Promise<GeneratedImage[]>,
    name: string,
    cost: number,
  ): Promise<GeneratedImage[]> {
    const task: GenerationTask = {
      id: uid(),
      kind: 'image',
      name,
      status: 'processing',
      progress: 60,
      cost,
      read: true,
      createdAt: Date.now(),
    }
    tasks.value.unshift(task)
    try {
      const result = await run()
      task.status = 'done'
      task.progress = 100
      task.doneAt = Date.now()
      task.read = false
      task.resultImages = result
      return result
    } catch (e) {
      task.status = 'failed'
      task.doneAt = Date.now()
      task.read = false
      throw e
    }
  }

  async function retryTask(id: string): Promise<string | undefined> {
    const t = tasks.value.find((x) => x.id === id)
    if (!t || t.kind !== 'video' || !t.videoReq) return
    tasks.value = tasks.value.filter((x) => x.id !== id)
    return createVideoTask(t.videoReq, t.name)
  }

  function markAllRead() {
    tasks.value.forEach((t) => {
      t.read = true
    })
  }

  return {
    tasks,
    toast,
    activeCount,
    unreadCount,
    createVideoTask,
    createImageTask,
    retryTask,
    markAllRead,
    dismissToast,
  }
})
