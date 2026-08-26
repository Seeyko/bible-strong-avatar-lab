import { GRAFFITI_COLOR_TOKENS } from '@bible-strong/avatar-core'

import { createAvatarDefinition } from '@/features/avatar/avatarDefinition'
import { resolveAvatarBehavior } from '@/features/avatar/avatars'
import { loadStudioDocument } from '@/features/studio/studioDocument'

describe('bundled RMP rubber-hose default', () => {
  it('opens the studio on the locked spray-can mascot', () => {
    const document = loadStudioDocument({ getItem: () => null })
    const avatar = document.library.avatars.find(candidate => candidate.id === 'strobi')
    if (!avatar) throw new Error('Bundled default avatar not found')

    expect(document.library.activeAvatarId).toBe('strobi')
    expect(avatar.name).toBe('Can Kid')
    expect(avatar.body.primary.type).toBe('can')
    expect(avatar.body.primary.canSpray).toBe(true)
    expect(avatar.body.nodes).toEqual([])
    expect(avatar.colors.body).toBe(GRAFFITI_COLOR_TOKENS.session)
    expect(avatar.colors.eyes).toBe('#111316')
    expect(document.sequences.some(sequence => sequence.id === 'walk')).toBe(true)
  })

  it('exports the can default without breaking the definition schema', () => {
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
    expect(result.value.body.primary.type).toBe('can')
    expect(result.value.body.primary.canSpray).toBe(true)
    expect(result.value.colors.body).toBe('#ee682a')
  })
})
