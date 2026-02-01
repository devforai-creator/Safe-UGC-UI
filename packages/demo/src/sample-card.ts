export const SAMPLE_CYBERPUNK = {
  meta: { name: 'cyberpunk-profile', version: '1.0.0' },
  assets: {
    avatar: '@assets/cyber-avatar.png',
  },
  state: {
    username: 'NETRUNNER_42',
    title: 'Elite Hacker',
    level: 'LV.42',
    hp: 87,
    maxHp: 100,
    hpLabel: '87 / 100',
    credits: '12,450 EC',
    bio: 'Jacking into the net since 2019. Specializing in ICE-breaking and data extraction.',
    chips: ['NETRUNNER', 'ICE-BREAKER', 'GHOST'],
  },
  styles: {
    label: { fontSize: 10, color: '#555570', letterSpacing: 1 },
    stat: { fontSize: 18, fontWeight: 'bold' },
  },
  views: {
    Main: {
      type: 'Box',
      style: {
        backgroundColor: '#0a0a12',
        padding: 24,
        borderRadius: 16,
        width: '360px',
      },
      children: [
        {
          type: 'Row',
          style: { gap: 16, alignItems: 'center', marginBottom: 16 },
          children: [
            { type: 'Avatar', src: '@assets/cyber-avatar.png', size: 56 },
            {
              type: 'Column',
              style: { gap: 2 },
              children: [
                {
                  type: 'Text',
                  content: { $ref: '$username' },
                  style: { fontSize: 20, color: '#00f0ff', fontWeight: 'bold' },
                },
                {
                  type: 'Text',
                  content: { $ref: '$title' },
                  style: { fontSize: 12, color: '#ff00aa', letterSpacing: 2 },
                },
              ],
            },
          ],
        },
        { type: 'Divider', color: '#1a1a2e', thickness: 1 },
        { type: 'Spacer', size: 16 },
        {
          type: 'Row',
          style: { justifyContent: 'space-between', marginBottom: 16 },
          children: [
            {
              type: 'Column',
              style: { alignItems: 'center' },
              children: [
                {
                  type: 'Text',
                  content: { $ref: '$level' },
                  style: { '$style': 'stat', color: '#ffcc00' },
                },
                { type: 'Text', content: 'LEVEL', style: { '$style': 'label' } },
              ],
            },
            {
              type: 'Column',
              style: { alignItems: 'center' },
              children: [
                {
                  type: 'Text',
                  content: { $ref: '$hpLabel' },
                  style: { '$style': 'stat', color: '#00ff88' },
                },
                { type: 'Text', content: 'HP', style: { '$style': 'label' } },
              ],
            },
            {
              type: 'Column',
              style: { alignItems: 'center' },
              children: [
                {
                  type: 'Text',
                  content: { $ref: '$credits' },
                  style: { '$style': 'stat', color: '#ff6600' },
                },
                { type: 'Text', content: 'CREDITS', style: { '$style': 'label' } },
              ],
            },
          ],
        },
        {
          type: 'ProgressBar',
          value: { $ref: '$hp' },
          max: { $ref: '$maxHp' },
          color: '#00ff88',
          style: { marginBottom: 16 },
        },
        {
          type: 'Row',
          style: { gap: 6, flexWrap: 'wrap', marginBottom: 16 },
          children: {
            for: 'c',
            in: '$chips',
            template: {
              type: 'Chip',
              label: { $ref: '$c' },
              color: '#00f0ff',
              style: { fontSize: 10 },
            },
          },
        },
        {
          type: 'Box',
          style: { backgroundColor: '#12121f', padding: 12, borderRadius: 8 },
          children: [
            {
              type: 'Text',
              content: { $ref: '$bio' },
              style: { fontSize: 12, color: '#8888aa', lineHeight: 18 },
            },
          ],
        },
      ],
    },
  },
};

export const SAMPLE_KAKAO = {
  meta: { name: 'kakao-chat', version: '1.0.0' },
  assets: {
    minji: '@assets/minji.png',
    yuna: '@assets/yuna.png',
    soobin: '@assets/soobin.png',
  },
  state: {
    roomName: '주말 여행 계획',
    memberCount: '4명',
    messages: [
      { name: '민지', msg: '토요일 몇 시에 출발해?', time: '2:41', avatar: '@assets/minji.png' },
      { name: '유나', msg: '9시 좋을 거 같아! 서울역에서 만나자', time: '2:42', avatar: '@assets/yuna.png' },
      { name: '수빈', msg: '내가 운전할게! 3명까지 탈 수 있어', time: '2:43', avatar: '@assets/soobin.png' },
    ],
    myMsg: '좋아~ 나는 간식 챙길게 🍙',
    myTime: '2:44',
  },
  views: {
    Main: {
      type: 'Box',
      style: {
        backgroundColor: '#b2c7d9',
        width: '380px',
        borderRadius: 12,
      },
      children: [
        {
          type: 'Box',
          style: { backgroundColor: '#a1b8cc', padding: 14, borderTopLeftRadius: 12, borderTopRightRadius: 12 },
          children: [
            {
              type: 'Row',
              style: { justifyContent: 'space-between', alignItems: 'center' },
              children: [
                {
                  type: 'Column',
                  children: [
                    {
                      type: 'Text',
                      content: { $ref: '$roomName' },
                      style: { fontSize: 16, fontWeight: 'bold', color: '#333333' },
                    },
                    {
                      type: 'Text',
                      content: { $ref: '$memberCount' },
                      style: { fontSize: 11, color: '#6b8299' },
                    },
                  ],
                },
                {
                  type: 'Row',
                  style: { gap: 8 },
                  children: [
                    { type: 'Icon', name: 'search', size: 18, color: '#6b8299' },
                    { type: 'Icon', name: 'settings', size: 18, color: '#6b8299' },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: 'Box',
          style: { padding: 12 },
          children: [
            {
              type: 'Column',
              style: { gap: 6 },
              children: {
                for: 'm',
                in: '$messages',
                template: {
                  type: 'Row',
                  style: { gap: 8, alignItems: 'start' },
                  children: [
                    { type: 'Avatar', src: { $ref: '$m.avatar' }, size: 34 },
                    {
                      type: 'Column',
                      style: { gap: 2 },
                      children: [
                        {
                          type: 'Text',
                          content: { $ref: '$m.name' },
                          style: { fontSize: 11, color: '#555555' },
                        },
                        {
                          type: 'Row',
                          style: { gap: 4, alignItems: 'end' },
                          children: [
                            {
                              type: 'Box',
                              style: { backgroundColor: '#ffffff', paddingTop: 7, paddingBottom: 7, paddingLeft: 10, paddingRight: 10, borderRadius: 12, alignSelf: 'start' },
                              children: [
                                {
                                  type: 'Text',
                                  content: { $ref: '$m.msg' },
                                  style: { fontSize: 13, color: '#333333' },
                                },
                              ],
                            },
                            {
                              type: 'Text',
                              content: { $ref: '$m.time' },
                              style: { fontSize: 10, color: '#8899aa' },
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              },
            },
            { type: 'Spacer', size: 6 },
            {
              type: 'Row',
              style: { justifyContent: 'end', gap: 4, alignItems: 'end' },
              children: [
                {
                  type: 'Text',
                  content: { $ref: '$myTime' },
                  style: { fontSize: 10, color: '#8899aa' },
                },
                {
                  type: 'Box',
                  style: { backgroundColor: '#fef01b', paddingTop: 7, paddingBottom: 7, paddingLeft: 10, paddingRight: 10, borderRadius: 12, alignSelf: 'end' },
                  children: [
                    {
                      type: 'Text',
                      content: { $ref: '$myMsg' },
                      style: { fontSize: 13, color: '#333333' },
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: 'Box',
          style: { backgroundColor: '#ffffff', padding: 10, margin: 12, borderRadius: 20 },
          children: [
            { type: 'Text', content: '메시지를 입력하세요...', style: { fontSize: 13, color: '#aaaaaa' } },
          ],
        },
      ],
    },
  },
};

export const SAMPLE_CHARACTER = {
  meta: { name: 'character-card', version: '1.0.0' },
  assets: {
    avatar: '@assets/char-avatar.png',
  },
  state: {
    name: '아리아',
    title: '별의 수호자',
    greeting: '안녕하세요, 모험자님. 오늘은 어떤 이야기를 나눠볼까요?',
    hp: 82,
    maxHp: 100,
    mp: 45,
    maxMp: 100,
    exp: 1680,
    maxExp: 2000,
    hpLabel: '82 / 100',
    mpLabel: '45 / 100',
    expLabel: '1680 / 2000',
    mood: 'Calm',
    tags: ['Fantasy', 'Healer', 'KR', 'SFW'],
    theme: {
      accent: '#a78bfa',
      hp: '#34d399',
      mp: '#60a5fa',
      exp: '#fbbf24',
      surface: '#18181b',
      surface2: '#27272a',
      text: '#fafafa',
      muted: '#a1a1aa',
    },
  },
  styles: {
    label: { fontSize: 10, color: '#a1a1aa', letterSpacing: 1 },
    value: { fontSize: 14, fontWeight: 'bold', color: '#fafafa' },
    cardBox: { backgroundColor: '#27272a', padding: 12, borderRadius: 12 },
  },
  views: {
    Main: {
      type: 'Box',
      style: {
        backgroundColor: '#18181b',
        padding: 20,
        borderRadius: 16,
        width: '360px',
      },
      children: [
        {
          type: 'Row',
          style: { gap: 14, alignItems: 'center', marginBottom: 16 },
          children: [
            { type: 'Avatar', src: '@assets/char-avatar.png', size: 60 },
            {
              type: 'Column',
              style: { gap: 4, flex: 1 },
              children: [
                {
                  type: 'Row',
                  style: { justifyContent: 'space-between', alignItems: 'center' },
                  children: [
                    {
                      type: 'Text',
                      content: { $ref: '$name' },
                      style: { fontSize: 20, fontWeight: 'bold', color: '#fafafa' },
                    },
                    {
                      type: 'Badge',
                      label: { $ref: '$mood' },
                      color: '#a78bfa',
                      style: { fontSize: 11 },
                    },
                  ],
                },
                {
                  type: 'Text',
                  content: { $ref: '$title' },
                  style: { fontSize: 12, color: '#a78bfa', letterSpacing: 1 },
                },
              ],
            },
          ],
        },
        {
          type: 'Box',
          style: {
            '$style': 'cardBox',
            marginBottom: 14,
          },
          children: [
            {
              type: 'Text',
              content: { $ref: '$greeting' },
              style: { fontSize: 13, color: '#d4d4d8', lineHeight: 20 },
            },
          ],
        },
        {
          type: 'Grid',
          style: { gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 },
          children: [
            {
              type: 'Box',
              style: { '$style': 'cardBox' },
              children: [
                { type: 'Text', content: 'HP', style: { '$style': 'label' } },
                {
                  type: 'Text',
                  content: { $ref: '$hpLabel' },
                  style: { '$style': 'value', color: '#34d399', marginBottom: 6 },
                },
                { type: 'ProgressBar', value: { $ref: '$hp' }, max: { $ref: '$maxHp' }, color: '#34d399' },
              ],
            },
            {
              type: 'Box',
              style: { '$style': 'cardBox' },
              children: [
                { type: 'Text', content: 'MP', style: { '$style': 'label' } },
                {
                  type: 'Text',
                  content: { $ref: '$mpLabel' },
                  style: { '$style': 'value', color: '#60a5fa', marginBottom: 6 },
                },
                { type: 'ProgressBar', value: { $ref: '$mp' }, max: { $ref: '$maxMp' }, color: '#60a5fa' },
              ],
            },
            {
              type: 'Box',
              style: { '$style': 'cardBox' },
              children: [
                { type: 'Text', content: 'EXP', style: { '$style': 'label' } },
                {
                  type: 'Text',
                  content: { $ref: '$expLabel' },
                  style: { '$style': 'value', color: '#fbbf24', marginBottom: 6 },
                },
                { type: 'ProgressBar', value: { $ref: '$exp' }, max: { $ref: '$maxExp' }, color: '#fbbf24' },
              ],
            },
          ],
        },
        {
          type: 'Row',
          style: { gap: 6, flexWrap: 'wrap', marginBottom: 14 },
          children: {
            for: 't',
            in: '$tags',
            template: {
              type: 'Chip',
              label: { $ref: '$t' },
              color: '#a1a1aa',
              style: { fontSize: 11 },
            },
          },
        },
        { type: 'Divider', color: 'rgba(255,255,255,0.08)', thickness: 1 },
        { type: 'Spacer', size: 14 },
        {
          type: 'Row',
          style: { gap: 10, justifyContent: 'space-between' },
          children: [
            { type: 'Button', label: '대화하기', action: 'onChat' },
            { type: 'Button', label: '프로필', action: 'onProfile' },
            { type: 'Button', label: '설정', action: 'onSettings' },
          ],
        },
      ],
    },
  },
};

export const SAMPLE_SHORTS = {
  meta: { name: 'shorts-ui', version: '1.0.0' },
  assets: {
    channel: '@assets/shorts-channel.png',
    music: '@assets/shorts-music.png',
  },
  state: {
    channelName: '@cooking_master',
    description: '3분 계란볶음밥 레시피 🍳🔥',
    hashtags: '#요리 #먹방 #레시피 #shorts',
    likes: '42.3K',
    comments: '1,892',
    shares: '3,201',
    musicTitle: 'original sound - cooking_master',
  },
  styles: {
    iconBtn: { alignItems: 'center', gap: 4 },
    iconLabel: { fontSize: 10, color: '#ffffff', fontWeight: 'bold' },
    overlay: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16 },
  },
  views: {
    Main: {
      type: 'Stack',
      style: { width: '340px', height: '600px', borderRadius: 12, overflow: 'hidden' },
      children: [
        {
          type: 'Box',
          style: {
            width: '340px',
            height: '600px',
            backgroundColor: '#1a1a1a',
          },
        },
        {
          type: 'Box',
          style: {
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundGradient: {
              type: 'linear',
              direction: '180deg',
              stops: [
                { color: 'rgba(0,0,0,0)', position: '40%' },
                { color: 'rgba(0,0,0,0.8)', position: '100%' },
              ],
            },
          },
        },
        {
          type: 'Box',
          style: { position: 'absolute', top: 14, left: 14, right: 14 },
          children: [
            {
              type: 'Row',
              style: { justifyContent: 'space-between', alignItems: 'center' },
              children: [
                {
                  type: 'Text',
                  content: 'Shorts',
                  style: { fontSize: 18, fontWeight: 'bold', color: '#ffffff' },
                },
                {
                  type: 'Row',
                  style: { gap: 16 },
                  children: [
                    { type: 'Icon', name: 'search', size: 22, color: '#ffffff' },
                    { type: 'Icon', name: 'settings', size: 22, color: '#ffffff' },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: 'Box',
          style: { position: 'absolute', right: 12, bottom: 90 },
          children: [
            {
              type: 'Column',
              style: { gap: 20, alignItems: 'center' },
              children: [
                {
                  type: 'Column',
                  style: { '$style': 'iconBtn' },
                  children: [
                    { type: 'Icon', name: 'heart', size: 28, color: '#ffffff' },
                    { type: 'Text', content: { $ref: '$likes' }, style: { '$style': 'iconLabel' } },
                  ],
                },
                {
                  type: 'Column',
                  style: { '$style': 'iconBtn' },
                  children: [
                    { type: 'Icon', name: 'chat', size: 28, color: '#ffffff' },
                    { type: 'Text', content: { $ref: '$comments' }, style: { '$style': 'iconLabel' } },
                  ],
                },
                {
                  type: 'Column',
                  style: { '$style': 'iconBtn' },
                  children: [
                    { type: 'Icon', name: 'share', size: 28, color: '#ffffff' },
                    { type: 'Text', content: { $ref: '$shares' }, style: { '$style': 'iconLabel' } },
                  ],
                },
                {
                  type: 'Box',
                  style: {
                    width: 32, height: 32, borderRadius: 6,
                    overflow: 'hidden',
                  },
                  children: [
                    {
                      type: 'Image',
                      src: '@assets/shorts-music.png',
                      alt: 'music',
                      style: { width: 32, height: 32 },
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: 'Box',
          style: { position: 'absolute', left: 14, right: 60, bottom: 16 },
          children: [
            {
              type: 'Column',
              style: { gap: 10 },
              children: [
                {
                  type: 'Row',
                  style: { gap: 10, alignItems: 'center' },
                  children: [
                    { type: 'Avatar', src: '@assets/shorts-channel.png', size: 32 },
                    {
                      type: 'Text',
                      content: { $ref: '$channelName' },
                      style: { fontSize: 13, fontWeight: 'bold', color: '#ffffff' },
                    },
                    {
                      type: 'Badge',
                      label: 'Subscribe',
                      color: '#ff0033',
                      style: { fontSize: 11 },
                    },
                  ],
                },
                {
                  type: 'Text',
                  content: { $ref: '$description' },
                  style: { fontSize: 13, color: '#ffffff' },
                },
                {
                  type: 'Row',
                  style: { gap: 6, alignItems: 'center' },
                  children: [
                    { type: 'Icon', name: 'tag', size: 12, color: '#aaaaaa' },
                    {
                      type: 'Text',
                      content: { $ref: '$musicTitle' },
                      style: { fontSize: 11, color: '#cccccc' },
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: 'Box',
          style: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, backgroundColor: '#ff0033' },
        },
      ],
    },
  },
};

export const SAMPLES: Record<string, unknown> = {
  'Character Card': SAMPLE_CHARACTER,
  'YouTube Shorts': SAMPLE_SHORTS,
  'Cyberpunk Profile': SAMPLE_CYBERPUNK,
  'KakaoTalk Chat': SAMPLE_KAKAO,
};
