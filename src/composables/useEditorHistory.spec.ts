import { describe, expect, it } from 'vitest'
import { HISTORY_LIMIT, pickSelection, useEditorHistory } from './useEditorHistory'

describe('useEditorHistory', () => {
  it('1. reset 後沒有上一步也沒有下一步', () => {
    const h = useEditorHistory()
    h.reset('d0', 'original')
    expect(h.canUndo.value).toBe(false)
    expect(h.canRedo.value).toBe(false)
    expect(h.undo()).toBeUndefined()
    expect(h.redo()).toBeUndefined()
  })

  it('2. record 新文件後可上一步回基準、可下一步回剛才那筆', () => {
    const h = useEditorHistory()
    h.reset('d0', 'original')
    expect(h.record('d1', 'a')).toBe(true)
    expect(h.canUndo.value).toBe(true)
    expect(h.undo()?.doc).toBe('d0')
    expect(h.canRedo.value).toBe(true)
    expect(h.redo()?.doc).toBe('d1')
    expect(h.canRedo.value).toBe(false)
  })

  it('3. record 與目前相同的文件不算一步', () => {
    const h = useEditorHistory()
    h.reset('d0', 'original')
    h.record('d1', 'a')
    expect(h.record('d1', 'b')).toBe(false)
    expect(h.undo()?.doc).toBe('d0')
    expect(h.undo()).toBeUndefined()
  })

  it('4. undo 後 record「還原到的那筆」（watch 回彈）不清掉下一步', () => {
    const h = useEditorHistory()
    h.reset('d0', 'original')
    h.record('d1', 'a')
    h.undo()
    expect(h.record('d0', 'original')).toBe(false)
    expect(h.canRedo.value).toBe(true)
    expect(h.redo()?.doc).toBe('d1')
  })

  it('5. undo 後做新操作會清掉下一步', () => {
    const h = useEditorHistory()
    h.reset('d0', 'original')
    h.record('d1', 'a')
    h.undo()
    expect(h.record('d2', 'a')).toBe(true)
    expect(h.canRedo.value).toBe(false)
    expect(h.redo()).toBeUndefined()
    // 被清掉的 d1 不能還躲在堆疊裡：上一步直接回基準
    expect(h.undo()?.doc).toBe('d0')
    expect(h.canUndo.value).toBe(false)
  })

  it('6. 最多保留 50 步，超過丟最舊的一筆', () => {
    const h = useEditorHistory()
    h.reset('d0', 'original')
    for (let i = 1; i <= 60; i++) h.record(`d${i}`, '')
    let last
    let undone = 0
    for (let entry = h.undo(); entry; entry = h.undo()) {
      last = entry
      undone += 1
    }
    expect(HISTORY_LIMIT).toBe(50)
    expect(undone).toBe(50)
    expect(last?.doc).toBe('d10')
    expect(h.canUndo.value).toBe(false)

    const small = useEditorHistory(3)
    small.reset('s0', '')
    for (let i = 1; i <= 5; i++) small.record(`s${i}`, '')
    const docs = [small.undo()?.doc, small.undo()?.doc, small.undo()?.doc, small.undo()?.doc]
    expect(docs).toEqual(['s4', 's3', 's2', undefined])
  })

  it('7. 同 mergeKey 在 1 秒內合併成一步，每次合併刷新時間', () => {
    const merged = useEditorHistory()
    merged.reset('d0', '')
    merged.record('d1', 'a', 'text:a', 0)
    merged.record('d2', 'a', 'text:a', 1000)
    expect(merged.undo()?.doc).toBe('d0')

    const split = useEditorHistory()
    split.reset('d0', '')
    split.record('d1', 'a', 'text:a', 0)
    split.record('d2', 'a', 'text:a', 1001)
    expect(split.undo()?.doc).toBe('d1')

    const refreshed = useEditorHistory()
    refreshed.reset('d0', '')
    refreshed.record('d1', 'a', 'nudge:a', 0)
    refreshed.record('d2', 'a', 'nudge:a', 900)
    refreshed.record('d3', 'a', 'nudge:a', 1800)
    expect(refreshed.undo()?.doc).toBe('d0')
    expect(refreshed.canUndo.value).toBe(false)
  })

  it('8. 不同 mergeKey 不合併，空字串 mergeKey 永不合併', () => {
    const different = useEditorHistory()
    different.reset('d0', '')
    different.record('d1', 'a', 'text:a', 0)
    different.record('d2', 'a', 'color:a', 10)
    expect(different.undo()?.doc).toBe('d1')

    const empty = useEditorHistory()
    empty.reset('d0', '')
    empty.record('d1', 'a', '', 0)
    empty.record('d2', 'a', '', 10)
    expect(empty.undo()?.doc).toBe('d1')
  })

  it('9. undo 後在時間窗內 record 同 mergeKey 不合併，新增一步並清掉下一步', () => {
    const h = useEditorHistory()
    h.reset('d0', '')
    h.record('d1', 'a', 'text:a', 0)
    h.record('d2', 'a', 'text:a', 100)
    h.record('d3', 'a', 'color:a', 200)
    expect(h.undo()?.doc).toBe('d2')
    expect(h.record('d4', 'a', 'text:a', 300)).toBe(true)
    expect(h.canRedo.value).toBe(false)
    expect(h.undo()?.doc).toBe('d2')
  })

  it('10. 合併不吃掉基準', () => {
    const h = useEditorHistory()
    h.reset('d0', '')
    h.record('d1', 'a', 'text:a', 0)
    h.record('d2', 'a', 'text:a', 10)
    expect(h.undo()?.doc).toBe('d0')
  })

  it('10b. 合併後回到上一步的文件（打字後在輸入框內原生撤銷）→ 這一步消失', () => {
    const h = useEditorHistory()
    h.reset('d0', '')
    h.record('d1', 'a', '', 0)
    h.record('d2', 'a', 'text:a', 10)
    h.record('d1', 'a', 'text:a', 20)
    expect(h.canRedo.value).toBe(false)
    expect(h.undo()?.doc).toBe('d0')
    expect(h.canUndo.value).toBe(false)
  })

  it('11. 還沒 reset 就 record，當成基準', () => {
    const h = useEditorHistory()
    expect(h.record('d0', 'original')).toBe(true)
    expect(h.canUndo.value).toBe(false)
    expect(h.canRedo.value).toBe(false)
  })
})

describe('pickSelection', () => {
  it('12. 復活的圖層優先，其次目前選取、紀錄的選取、原圖、空', () => {
    expect(pickSelection(['original'], ['b', 'a', 'original'], 'original', 'x')).toBe('b')
    expect(pickSelection(['a', 'original'], ['a', 'original'], 'a', 'original')).toBe('a')
    expect(pickSelection(['a', 'original'], ['original'], 'a', 'original')).toBe('original')
    expect(pickSelection(['a', 'b', 'original'], ['b', 'original'], 'a', 'b')).toBe('b')
    expect(pickSelection(['a', 'b', 'original'], ['b', 'original'], 'a', 'gone')).toBe('original')
    expect(pickSelection(['a'], [], 'a', 'a')).toBe('')
  })
})
