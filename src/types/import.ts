export type ImportSource = 'pocket' | 'instapaper' | 'matter'

export type ImportResult = {
  ok: true
  imported: number
  duplicates: number
  errors: string[]
}
