import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '@/api'
import { i18n } from '@/lang'
import type { GenerationTask, GenerationTaskKind, GeneratedImage, GeneratedPost, VideoJobReq } from '@/types/api'

let seq = 0
const uid = () => `imgtask_${Date.now()}_${++seq}`

// 背景生成任務：跨頁面（圖生圖／圖生影／行銷 PO 文共用），不綁在任何頁面元件的生命週期上，
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

  // 呼叫端自己 await 結果的生成（圖生圖、行銷 PO 文）：任務只負責讓任務中心看得到進行中與成敗。
  // 一定要改 tasks 裡的 reactive proxy——改 unshift 進去的原物件不會觸發徽章與面板更新
  function addTask(kind: GenerationTaskKind, name: string, cost: number): GenerationTask {
    tasks.value.unshift({
      id: uid(),
      kind,
      name,
      status: 'processing',
      progress: 60,
      cost,
      read: true,
      createdAt: Date.now(),
    })
    return tasks.value[0]
  }
  function finish(task: GenerationTask, status: 'done' | 'failed', error?: string) {
    task.status = status
    if (status === 'done') task.progress = 100
    task.error = error
    task.doneAt = Date.now()
    task.read = false
  }

  // 圖生圖：包一層只是讓任務紀錄／任務中心跟影片走同一條路徑。errorText 由頁面傳入，面板與頁面講同一句錯誤
  async function createImageTask(
    run: () => Promise<GeneratedImage[]>,
    name: string,
    cost: number,
    errorText?: (e: unknown) => string,
  ): Promise<GeneratedImage[]> {
    const task = addTask('image', name, cost)
    try {
      const result = await run()
      task.resultImages = result
      finish(task, 'done')
      return result
    } catch (e) {
      finish(task, 'failed', errorText?.(e))
      throw e
    }
  }

  // 行銷 PO 文：配圖與文案是兩支獨立端點（各自扣點、各自成敗），所以一半記一筆任務，
  // 「文案＋配圖」在任務中心就是兩筆、各自顯示完成或失敗。errorText 由頁面傳入，面板與頁面講同一句錯誤。
  // ponytail: 不支援從面板重試——結果只活在行銷頁元件裡，面板重做會扣點卻看不到結果；重做走頁面的「換一張圖／重寫文案」
  async function createMarketingTask(
    run: () => Promise<GeneratedPost>,
    halves: { kind: 'marketingImage' | 'marketingText'; name: string; cost: number }[],
    errorText: (e: unknown) => string,
  ): Promise<GeneratedPost> {
    const mine = halves.map((h) => addTask(h.kind, h.name, h.cost))
    try {
      const post = await run()
      for (const task of mine) {
        const ok = task.kind === 'marketingImage' ? !!post.poster : post.copy !== undefined
        if (ok) finish(task, 'done')
        else finish(task, 'failed', errorText(post.partialError))
      }
      return post
    } catch (e) {
      mine.forEach((task) => finish(task, 'failed', errorText(e)))
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
    createMarketingTask,
    retryTask,
    markAllRead,
    dismissToast,
  }
})
