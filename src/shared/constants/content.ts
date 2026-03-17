import type { PracticeDifficulty } from '@/shared/types/domain'

export const PRACTICE_COPY: Record<
  PracticeDifficulty,
  { title: string; subtitle: string; length: number }
> = {
  starter: {
    title: '字母点亮',
    subtitle: '优先点亮薄弱键位，把单键命中率先练稳。',
    length: 10,
  },
  standard: {
    title: '单词巡航',
    subtitle: '把高频短词练到顺手，开始建立连续输出节奏。',
    length: 8,
  },
  challenge: {
    title: '短句冲刺',
    subtitle: '进入短句节奏，训练更长的连续输入稳定性。',
    length: 6,
  },
}
