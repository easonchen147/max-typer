interface FingerGuide {
  hand: string
  finger: string
  anchorKey: string
  hint: string
}

const FINGER_GUIDES: Record<string, FingerGuide> = {
  q: { hand: '左手', finger: '小拇指', anchorKey: 'A', hint: '从 A 出发，轻抬手指去够上排。' },
  a: { hand: '左手', finger: '小拇指', anchorKey: 'A', hint: '左手小拇指守住 A，打完回到家。' },
  z: { hand: '左手', finger: '小拇指', anchorKey: 'A', hint: '从 A 往下按，手腕尽量别晃动。' },
  w: { hand: '左手', finger: '无名指', anchorKey: 'S', hint: '让无名指从 S 轻轻伸到上排。' },
  s: { hand: '左手', finger: '无名指', anchorKey: 'S', hint: '左手无名指守住 S，保持放松。' },
  x: { hand: '左手', finger: '无名指', anchorKey: 'S', hint: '从 S 下探到下排，打完马上回位。' },
  e: { hand: '左手', finger: '中指', anchorKey: 'D', hint: '左手中指从 D 上提，不要整只手一起挪。' },
  d: { hand: '左手', finger: '中指', anchorKey: 'D', hint: '左手中指稳住 D，就是你的家键。' },
  c: { hand: '左手', finger: '中指', anchorKey: 'D', hint: '中指下探到 C，保持节奏均匀。' },
  r: { hand: '左手', finger: '食指', anchorKey: 'F', hint: '左手食指从 F 出发，手指伸展就够了。' },
  f: { hand: '左手', finger: '食指', anchorKey: 'F', hint: '食指贴住 F 的定位点，打完回到这里。' },
  v: { hand: '左手', finger: '食指', anchorKey: 'F', hint: '左手食指轻点 V，不需要低头找键。' },
  t: { hand: '左手', finger: '食指', anchorKey: 'F', hint: '食指从 F 去 T，保持手掌稳定。' },
  g: { hand: '左手', finger: '食指', anchorKey: 'F', hint: '左手食指兼顾 G，动作要短。' },
  b: { hand: '左手', finger: '食指', anchorKey: 'F', hint: 'B 也归左手食指，按完回 F。' },
  y: { hand: '右手', finger: '食指', anchorKey: 'J', hint: '右手食指从 J 出发，去上排时手腕别飘。' },
  h: { hand: '右手', finger: '食指', anchorKey: 'J', hint: '右手食指兼顾 H，保持手指独立。' },
  n: { hand: '右手', finger: '食指', anchorKey: 'J', hint: '从 J 下探到 N，动作短一点。' },
  u: { hand: '右手', finger: '食指', anchorKey: 'J', hint: '右手食指从 J 上提到 U。' },
  j: { hand: '右手', finger: '食指', anchorKey: 'J', hint: '食指守住 J 的定位点，打完回家。' },
  m: { hand: '右手', finger: '食指', anchorKey: 'J', hint: '右手食指负责 M，按完回到 J。' },
  i: { hand: '右手', finger: '中指', anchorKey: 'K', hint: '右手中指从 K 上提，保持视线看屏幕。' },
  k: { hand: '右手', finger: '中指', anchorKey: 'K', hint: '右手中指守住 K，就是你的落点。' },
  o: { hand: '右手', finger: '无名指', anchorKey: 'L', hint: '右手无名指去 O，幅度不要过大。' },
  l: { hand: '右手', finger: '无名指', anchorKey: 'L', hint: '右手无名指守住 L，动作轻快一些。' },
  p: { hand: '右手', finger: '小拇指', anchorKey: ';', hint: '右手小拇指负责最外侧按键，慢一点也没关系。' },
  space: { hand: '双手', finger: '拇指', anchorKey: 'Space', hint: '空格建议用拇指轻点，不要抬整只手。' },
}

export const getFingerGuide = (key: string) => FINGER_GUIDES[key.toLowerCase()] ?? null
