import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { routes } from './routes'

describe('generate routes', () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes,
  })

  it.each([
    ['/generate/image', 'generate-image'],
    ['/generate/post', 'generate-post'],
    ['/generate/video', 'generate-video'],
    ['/generate/tryon', 'generate-tryon'],
  ])('preserves %s as route %s', (path, name) => {
    expect(router.resolve(path).name).toBe(name)
  })
})
