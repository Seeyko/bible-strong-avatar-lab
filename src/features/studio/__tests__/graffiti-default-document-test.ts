import { GRAFFITI_COLOR_TOKENS } from '@bible-strong/avatar-core'

import { createAvatarDefinition } from '@/features/avatar/avatarDefinition'
import { resolveAvatarBehavior } from '@/features/avatar/avatars'
import { loadStudioDocument } from '@/features/studio/studioDocument'

describe('bundled Thomas graffiti default', () => {
  it('opens the studio on one middle ring and two blob eyes', () => {
    const document = loadStudioDocument({ getItem: () => null })
    const avatar = document.library.avatars.find(candidate => candidate.id === 'strobi')
    if (!avatar) throw new Error('Bundled default avatar not found')

    expect(document.library.activeAvatarId).toBe('strobi')
    expect(avatar.body.primary.type).toBe('graffiti')
    expect(avatar.body.primary.graffitiRing).toBe('uniform')
    expect(avatar.body.nodes).toEqual([])
    expect(avatar.colors.body).toBe(GRAFFITI_COLOR_TOKENS.spot)
    expect(avatar.colors.eyes).toBe('#111316')
    expect(avatar.eyes.glyphLeft).toBe('blob-07')
    expect(avatar.eyes.glyphRight).toBe('blob-06')
  })

  it('exports the graffiti default without breaking the definition schema', () => {
    const document = loadStudioDocument({ getItem: () => null })
    const avatar = document.library.avatars.find(candidate => candidate.id === 'strobi')
    if (!avatar) throw new Error('Bundled default avatar not found')
    const result = createAvatarDefinition({
      avatar,
      behavior: resolveAvatarBehavior(avatar, {
        expressions: document.expressions,
        sequences: document.sequences,
      }),
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.body.primary.type).toBe('graffiti')
    expect(result.value.body.primary.graffitiRing).toBe('uniform')
    expect(result.value.colors.body).toBe('#289bd2')
  })
})
