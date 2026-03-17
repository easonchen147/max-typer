import Dexie, { type EntityTable } from 'dexie'

import type { KeyStrokeRecord, PracticeSessionRecord, UserProfile } from '@/shared/types/domain'

export class MaxTyperDatabase extends Dexie {
  public profiles!: EntityTable<UserProfile, 'id'>
  public sessions!: EntityTable<PracticeSessionRecord, 'id'>
  public keyStrokes!: EntityTable<KeyStrokeRecord, 'id'>

  public constructor(databaseName = 'max-typer') {
    super(databaseName)

    this.version(1).stores({
      profiles: 'id, updatedAt',
      sessions: 'id, mode, difficulty, startedAt',
      keyStrokes: 'id, sessionId, letter, timestamp, mode',
    })
  }
}
