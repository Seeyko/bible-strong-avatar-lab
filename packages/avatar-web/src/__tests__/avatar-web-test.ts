// @vitest-environment jsdom

import { MAX_BODY_NODES, MAX_OVERLAY_PATHS } from '@bible-strong/avatar-core'

import definitionJson from '../../../../examples/react-vite-consumer/src/strobi.avatar.json'
import { createAvatar } from '../index'

describe('@bible-strong/avatar-web', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="avatar"></div>'
    vi.stubGlobal('requestAnimationFrame', () => 1)
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
  })

  afterEach(() => vi.unstubAllGlobals())

  it('mounts the shared avatar definition without React', () => {
    const avatar = createAvatar('#avatar', {
      definition: definitionJson,
      defaultExpression: 'neutral',
      size: 180,
    })

    expect(document.querySelector('#avatar svg')).not.toBeNull()
    expect(document.querySelectorAll('#avatar svg > path')).toHaveLength(
      MAX_BODY_NODES + 2 + MAX_BODY_NODES + 2 + 1 + MAX_OVERLAY_PATHS * 2
    )
    expect(document.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe(
      'Procedural avatar'
    )
    expect(avatar.getState()).toMatchObject({
      activeExpression: 'neutral',
      status: 'stopped',
    })

    avatar.destroy()
    expect(document.querySelector('#avatar svg')).toBeNull()
  })

  it('returns typed errors for unknown targets', () => {
    const avatar = createAvatar('#avatar', { definition: definitionJson })

    expect(avatar.play('missing')).toEqual({
      ok: false,
      error: expect.objectContaining({ code: 'unknown_animation', key: 'missing' }),
    })
    expect(avatar.setExpression('missing')).toEqual({
      ok: false,
      error: expect.objectContaining({ code: 'unknown_expression', key: 'missing' }),
    })
  })
})
