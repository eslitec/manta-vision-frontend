import { mockApi } from './mock'

// 全站唯一的 API 入口。目前指向 mock；後端就緒後把這裡換成打 http 的實作即可。
export const api = mockApi

export { http, ctx } from './http'
