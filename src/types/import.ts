export type ImportSource = 'pocket' | 'instapaper'

export type ImportResult = {
  ok: true
  imported: number
  duplicates: number
  errors: string[]
}
