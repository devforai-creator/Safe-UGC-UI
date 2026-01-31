export const SAMPLE_CYBERPUNK = {
  meta: { name: 'cyberpunk-profile', version: '1.0.0' },
  state: {
    username: 'NETRUNNER_42',
    title: 'Elite Hacker',
    level: 'LV.42',
    hp: '87 / 100',
    credits: '12,450 EC',
    bio: 'Jacking into the net since 2019. Specializing in ICE-breaking and data extraction.',
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
            {
              type: 'Box',
              style: {
                width: 56,
                height: 56,
                borderRadius: 9999,
                backgroundColor: '#00f0ff',
                opacity: 0.9,
              },
            },
            {
              type: 'Column',
              style: { gap: 2 },
              children: [
                {
                  type: 'Text',
                  props: { content: { $ref: '$username' } },
                  style: { fontSize: 20, color: '#00f0ff' },
                },
                {
                  type: 'Text',
                  props: { content: { $ref: '$title' } },
                  style: { fontSize: 12, color: '#ff00aa', letterSpacing: 2 },
                },
              ],
            },
          ],
        },
        {
          type: 'Box',
          style: { height: 1, backgroundColor: '#1a1a2e', marginBottom: 16 },
        },
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
                  props: { content: { $ref: '$level' } },
                  style: { fontSize: 18, color: '#ffcc00' },
                },
                {
                  type: 'Text',
                  props: { content: 'LEVEL' },
                  style: { fontSize: 10, color: '#555570' },
                },
              ],
            },
            {
              type: 'Column',
              style: { alignItems: 'center' },
              children: [
                {
                  type: 'Text',
                  props: { content: { $ref: '$hp' } },
                  style: { fontSize: 18, color: '#00ff88' },
                },
                {
                  type: 'Text',
                  props: { content: 'HP' },
                  style: { fontSize: 10, color: '#555570' },
                },
              ],
            },
            {
              type: 'Column',
              style: { alignItems: 'center' },
              children: [
                {
                  type: 'Text',
                  props: { content: { $ref: '$credits' } },
                  style: { fontSize: 18, color: '#ff6600' },
                },
                {
                  type: 'Text',
                  props: { content: 'CREDITS' },
                  style: { fontSize: 10, color: '#555570' },
                },
              ],
            },
          ],
        },
        {
          type: 'Box',
          style: { backgroundColor: '#12121f', padding: 12, borderRadius: 8 },
          children: [
            {
              type: 'Text',
              props: { content: { $ref: '$bio' } },
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
  state: {
    roomName: 'Weekend Trip Planning',
    memberCount: '4',
    name1: 'Minji',
    msg1: 'When are we leaving Saturday?',
    time1: '2:41 PM',
    name2: 'Yuna',
    msg2: "I think 9 AM is good! Let's meet at Seoul Station",
    time2: '2:42 PM',
    msg3: 'Sounds perfect to me',
    time3: '2:42 PM',
    name3: 'Soobin',
    msg4: "I'll drive! I can take 3 people",
    time4: '2:43 PM',
    myMsg: "Great, I'll bring snacks for the road",
    myTime: '2:44 PM',
  },
  views: {
    Main: {
      type: 'Box',
      style: {
        backgroundColor: '#b2c7d9',
        width: '380px',
        height: '580px',
        borderRadius: 12,
        display: 'flex',
        flexDirection: 'column',
      },
      children: [
        // Header bar
        {
          type: 'Box',
          style: {
            backgroundColor: '#a1b8cc',
            padding: 14,
            borderRadius: 0,
          },
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
                      props: { content: { $ref: '$roomName' } },
                      style: { fontSize: 16, color: '#333333' },
                    },
                    {
                      type: 'Text',
                      props: { content: { $ref: '$memberCount' } },
                      style: { fontSize: 11, color: '#6b8299' },
                    },
                  ],
                },
                // Search / menu icons placeholder
                {
                  type: 'Row',
                  style: { gap: 12 },
                  children: [
                    {
                      type: 'Box',
                      style: { width: 20, height: 20, borderRadius: 4, backgroundColor: '#8fa8bc' },
                    },
                    {
                      type: 'Box',
                      style: { width: 20, height: 20, borderRadius: 4, backgroundColor: '#8fa8bc' },
                    },
                  ],
                },
              ],
            },
          ],
        },

        // Chat area
        {
          type: 'Box',
          style: { padding: 12, display: 'flex', flexDirection: 'column', gap: 10 },
          children: [
            // --- Message 1: Minji (other) ---
            {
              type: 'Row',
              style: { gap: 8, alignItems: 'start' },
              children: [
                // Avatar
                {
                  type: 'Box',
                  style: {
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    backgroundColor: '#ff9eaa',
                    minWidth: 36,
                  },
                },
                {
                  type: 'Column',
                  style: { gap: 4 },
                  children: [
                    {
                      type: 'Text',
                      props: { content: { $ref: '$name1' } },
                      style: { fontSize: 11, color: '#555555' },
                    },
                    {
                      type: 'Row',
                      style: { gap: 4, alignItems: 'end' },
                      children: [
                        {
                          type: 'Box',
                          style: {
                            backgroundColor: '#ffffff',
                            padding: 10,
                            borderRadius: 12,
                            maxWidth: '220px',
                          },
                          children: [
                            {
                              type: 'Text',
                              props: { content: { $ref: '$msg1' } },
                              style: { fontSize: 13, color: '#333333', lineHeight: 18 },
                            },
                          ],
                        },
                        {
                          type: 'Text',
                          props: { content: { $ref: '$time1' } },
                          style: { fontSize: 10, color: '#8899aa' },
                        },
                      ],
                    },
                  ],
                },
              ],
            },

            // --- Message 2: Yuna (other) ---
            {
              type: 'Row',
              style: { gap: 8, alignItems: 'start' },
              children: [
                {
                  type: 'Box',
                  style: {
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    backgroundColor: '#a8d8ea',
                    minWidth: 36,
                  },
                },
                {
                  type: 'Column',
                  style: { gap: 4 },
                  children: [
                    {
                      type: 'Text',
                      props: { content: { $ref: '$name2' } },
                      style: { fontSize: 11, color: '#555555' },
                    },
                    {
                      type: 'Row',
                      style: { gap: 4, alignItems: 'end' },
                      children: [
                        {
                          type: 'Box',
                          style: {
                            backgroundColor: '#ffffff',
                            padding: 10,
                            borderRadius: 12,
                            maxWidth: '220px',
                          },
                          children: [
                            {
                              type: 'Text',
                              props: { content: { $ref: '$msg2' } },
                              style: { fontSize: 13, color: '#333333', lineHeight: 18 },
                            },
                          ],
                        },
                        {
                          type: 'Text',
                          props: { content: { $ref: '$time2' } },
                          style: { fontSize: 10, color: '#8899aa' },
                        },
                      ],
                    },
                    // Second bubble (continuation)
                    {
                      type: 'Row',
                      style: { gap: 4, alignItems: 'end' },
                      children: [
                        {
                          type: 'Box',
                          style: {
                            backgroundColor: '#ffffff',
                            padding: 10,
                            borderRadius: 12,
                            maxWidth: '220px',
                          },
                          children: [
                            {
                              type: 'Text',
                              props: { content: { $ref: '$msg3' } },
                              style: { fontSize: 13, color: '#333333', lineHeight: 18 },
                            },
                          ],
                        },
                        {
                          type: 'Text',
                          props: { content: { $ref: '$time3' } },
                          style: { fontSize: 10, color: '#8899aa' },
                        },
                      ],
                    },
                  ],
                },
              ],
            },

            // --- Message 3: Soobin (other) ---
            {
              type: 'Row',
              style: { gap: 8, alignItems: 'start' },
              children: [
                {
                  type: 'Box',
                  style: {
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    backgroundColor: '#c3aed6',
                    minWidth: 36,
                  },
                },
                {
                  type: 'Column',
                  style: { gap: 4 },
                  children: [
                    {
                      type: 'Text',
                      props: { content: { $ref: '$name3' } },
                      style: { fontSize: 11, color: '#555555' },
                    },
                    {
                      type: 'Row',
                      style: { gap: 4, alignItems: 'end' },
                      children: [
                        {
                          type: 'Box',
                          style: {
                            backgroundColor: '#ffffff',
                            padding: 10,
                            borderRadius: 12,
                            maxWidth: '220px',
                          },
                          children: [
                            {
                              type: 'Text',
                              props: { content: { $ref: '$msg4' } },
                              style: { fontSize: 13, color: '#333333', lineHeight: 18 },
                            },
                          ],
                        },
                        {
                          type: 'Text',
                          props: { content: { $ref: '$time4' } },
                          style: { fontSize: 10, color: '#8899aa' },
                        },
                      ],
                    },
                  ],
                },
              ],
            },

            // --- My message (right-aligned) ---
            {
              type: 'Row',
              style: { justifyContent: 'end', gap: 4, alignItems: 'end' },
              children: [
                {
                  type: 'Text',
                  props: { content: { $ref: '$myTime' } },
                  style: { fontSize: 10, color: '#8899aa' },
                },
                {
                  type: 'Box',
                  style: {
                    backgroundColor: '#fef01b',
                    padding: 10,
                    borderRadius: 12,
                    maxWidth: '220px',
                  },
                  children: [
                    {
                      type: 'Text',
                      props: { content: { $ref: '$myMsg' } },
                      style: { fontSize: 13, color: '#333333', lineHeight: 18 },
                    },
                  ],
                },
              ],
            },
          ],
        },

        // Input area
        {
          type: 'Box',
          style: {
            backgroundColor: '#ffffff',
            padding: 10,
            marginTop: 8,
            marginLeft: 12,
            marginRight: 12,
            borderRadius: 20,
          },
          children: [
            {
              type: 'Text',
              props: { content: 'Type a message...' },
              style: { fontSize: 13, color: '#aaaaaa' },
            },
          ],
        },
      ],
    },
  },
};

export const SAMPLES: Record<string, unknown> = {
  'Cyberpunk Profile': SAMPLE_CYBERPUNK,
  'KakaoTalk Chat': SAMPLE_KAKAO,
};
