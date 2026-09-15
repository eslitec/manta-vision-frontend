import type { Session } from '@/types/api'

// 測試用的資料工廠。**只給 .spec 檔用**，沒有任何應用程式碼 import 它。
//
// 存在的理由：`Session` 之後還會長欄位（接真後端時就長了 token／botId／role／
// expiresAt 四個）。欄位散在各個測試裡手寫的話，每加一個就要改十幾處；
// 集中在這裡，只要改這一個檔案。

/** 一小時後過期的有效 session；要測特定情境就用 overrides 蓋掉需要的欄位。 */
export function fakeSession(overrides: Partial<Session> = {}): Session {
  return {
    username: 'mavis',
    displayName: 'Mavis',
    token: 'test-token',
    botId: 'bot-test',
    role: 'admin',
    expiresAt: Date.now() + 60 * 60 * 1000,
    ...overrides,
  }
}
