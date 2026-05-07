export type ImportSource = 'pocket' | 'instapaper' | 'matter' | 'raindrop'

export type ImportResult = {
  ok: true
  imported: number
  duplicates: number
  errors: string[]
}
