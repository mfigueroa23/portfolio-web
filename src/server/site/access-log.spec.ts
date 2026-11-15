import { accessLogLine } from './access-log';

describe('accessLogLine', () => {
  it('writes one JSON line with the request and response details', () => {
    const line = accessLogLine({
      time: new Date('2026-11-14T12:00:00.000Z'),
      remoteAddress: '203.0.113.9',
      method: 'GET',
      path: '/projects',
      status: 200,
      bytes: 512,
      durationMs: 12.5,
      referer: undefined,
      userAgent: 'curl/8',
    });
    expect(JSON.parse(line)).toEqual({
      time: '2026-11-14T12:00:00.000Z',
      remote_addr: '203.0.113.9',
      method: 'GET',
      uri: '/projects',
      status: 200,
      bytes: 512,
      request_time: 0.013,
      referer: '',
      user_agent: 'curl/8',
    });
  });
});
