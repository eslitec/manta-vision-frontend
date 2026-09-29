import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '@/api'
import { CLIENT_ERROR_CODES, hasErrorCode, isApiError } from '@/api/errors'
import { i18n } from '@/lang'
import { displayMessage } from '@/utils/error'
import { useFeedStore } from '@/stores/feed'
import type {
  GenerationTask,
  GenerationTaskKind,
  GeneratedPost,
  VideoJob,
  VideoJobReq,
} from '@/types/api'

let seq = 0
const uid = () => `imgtask_${Date.now()}_${++seq}`

// 背景生成任務：跨頁面（圖生圖／圖生影／行銷 PO 文／AI 試穿／AI 修圖共用），不綁在任何頁面元件的生命週期上，
// 使用者離開頁面後任務仍持續在背景輪詢，驅動頂部工具列「任務」徽章與任務中心面板。
export const useGenerationTasksStore = defineStore('generationTasks', () => {
  const tasks = ref<GenerationTask[]>([])
  const toast = ref<{ taskId: string; title: string; message: string; kind: 'done' | 'failed' } | null>(null)
  const timers = new Map<string, ReturnType<typeof setInterval>>()
  let epoch = 0 // reset 一次加一：reset 之前發出、之後才回來的還原結果不採用

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

  // failReason 代碼（後端 upstreamError／storageError／contentBlocked）→ 文案；不認得的代碼只說生成失敗
  function failReasonText(code?: string) {
    const { t, te } = i18n.global
    return code && te(`video.failReasons.${code}`) ? t(`video.failReasons.${code}`) : t('taskCenter.failed')
  }

  // 輪詢打的是 GET，本身冪等：斷線、逾時、5xx（部署中、代理吐的 502）下一輪再問；
  // 其他錯誤（404 任務不見、401／403）結果已確定，再問也一樣，停止並標失敗（401 另由 session 攔截器登出、reset）
  const isPollRetryable = (e: unknown) =>
    hasErrorCode(e, CLIENT_ERROR_CODES.TIMEOUT) ||
    hasErrorCode(e, CLIENT_ERROR_CODES.NETWORK_ERROR) ||
    (isApiError(e) && e.status >= 500)

  function applyVideoJob(t: GenerationTask, j: VideoJob) {
    t.status = j.status
    t.progress = Math.max(0, Math.min(100, j.progress)) // 後端估算，前端不自行累加
    t.cost = j.cost // 預扣 → 實扣；失敗釋放後為 0
    t.etaSeconds = j.etaSeconds
    t.resultUrl = j.resultUrl
    t.durationMs = j.durationMs
    if (j.status === 'failed') t.error = failReasonText(j.error)
  }

  function endVideoTask(t: GenerationTask, kind: 'done' | 'failed') {
    clearTimer(t.id)
    if (kind === 'done') t.progress = 100
    t.doneAt = Date.now()
    t.read = false
    showToast(t, kind)
    // 完成是實扣、失敗是釋放預留（審核擋下除外）：餘額都可能變了
    useFeedStore()
      .refresh()
      .catch(() => undefined)
  }

  function poll(taskId: string) {
    if (timers.has(taskId)) return // 同一個任務只輪詢一份，不留下清不掉的計時器
    const timer = setInterval(async () => {
      const t = tasks.value.find((x) => x.id === taskId)
      if (!t) return clearTimer(taskId)
      try {
        const j = await api.getVideoJob(taskId)
        if (!timers.has(taskId)) return // 回應回來前已收尾或已登出（reset）
        applyVideoJob(t, j)
        if (j.status === 'done' || j.status === 'failed') endVideoTask(t, j.status)
      } catch (e) {
        if (!timers.has(taskId) || isPollRetryable(e)) return
        t.status = 'failed'
        t.error = displayMessage(e, failReasonText())
        endVideoTask(t, 'failed')
      }
    }, 3000) // 契約建議 3 秒（v13 #22）
    timers.set(taskId, timer)
  }

  // 影片生成：送出後立刻回傳 taskId，呼叫端可選擇性記錄用於本頁預覽，但任務本身不受頁面卸載影響
  async function createVideoTask(req: VideoJobReq, name: string): Promise<string> {
    const job = await api.createVideoJob({ ...req, taskName: name })
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

  // 重新整理或重新登入後把後端還在追的影片任務（GET /video，最近 10 筆）併回任務中心，進行中的續輪詢。
  // 已在清單上的跳過；還原的任務沒有 videoReq（#23 不回原始參數），所以不能從面板重試。
  // ponytail: 已讀只存在記憶體，重新整理前就完成的任務一律當已讀，不再亮紅點
  async function restoreVideoTasks() {
    const mine = epoch
    let jobs: VideoJob[]
    try {
      jobs = await api.listVideoJobs()
    } catch (e) {
      console.warn('還原影片任務失敗', e)
      return
    }
    if (mine !== epoch) return // 回來前已登出：那是上一個帳號的任務
    for (const j of jobs) {
      if (tasks.value.some((x) => x.id === j.id)) continue
      const task: GenerationTask = {
        id: j.id,
        kind: 'video',
        name: j.name ?? '',
        status: j.status,
        progress: j.progress,
        cost: j.cost,
        read: true,
        createdAt: Date.now(),
      }
      applyVideoJob(task, j)
      tasks.value.push(task) // 後端新到舊，接在這個分頁新送出的任務後面
      if (j.status === 'pending' || j.status === 'processing') poll(j.id)
    }
  }

  // 登出（含 token 失效）時呼叫：停掉所有輪詢、清空任務，下一個帳號看不到上一個人的任務
  function reset() {
    epoch++
    for (const id of [...timers.keys()]) clearTimer(id)
    tasks.value = []
    toast.value = null
  }

  // 呼叫端自己 await 結果的生成（圖生圖、行銷 PO 文、AI 試穿、AI 修圖）：任務只負責讓任務中心看得到進行中與成敗。
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

  // 頁面照原樣呼叫自己的 API（run），這裡只記一筆任務：進行中 → 完成／失敗，結果與錯誤原封不動交還頁面。
  // errorText 由頁面傳入，面板與頁面講同一句錯誤。
  // ponytail: 這類任務不支援從面板重試——結果只活在各自頁面元件裡，面板重做會扣點卻看不到結果
  async function trackTask<T>(
    kind: GenerationTaskKind,
    name: string,
    cost: number,
    run: () => Promise<T>,
    errorText: (e: unknown) => string,
  ): Promise<T> {
    const task = addTask(kind, name, cost)
    try {
      const result = await run()
      finish(task, 'done')
      return result
    } catch (e) {
      finish(task, 'failed', errorText(e))
      throw e
    }
  }

  // 行銷 PO 文：配圖與文案是兩支獨立端點（各自扣點、各自成敗），所以一半記一筆任務，
  // 「文案＋配圖」在任務中心就是兩筆、各自顯示完成或失敗。只成功一半時失敗那筆帶 partialError 的原因
  async function createMarketingTask(
    run: () => Promise<GeneratedPost>,
    halves: { kind: 'marketingImage' | 'marketingText'; name: string; cost: number }[],
    errorText: (e: unknown) => string,
  ): Promise<GeneratedPost> {
    const post = run()
    const half = async (kind: 'marketingImage' | 'marketingText') => {
      const p = await post
      if (kind === 'marketingImage' ? !p.poster : p.copy === undefined) throw p.partialError
    }
    // 每一半的錯誤已記在各自的任務上；整次失敗的錯誤由下面的 return 丟回頁面
    await Promise.allSettled(halves.map((h) => trackTask(h.kind, h.name, h.cost, () => half(h.kind), errorText)))
    return post
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
    trackTask,
    restoreVideoTasks,
    reset,
    createMarketingTask,
    retryTask,
    markAllRead,
    dismissToast,
  }
})
