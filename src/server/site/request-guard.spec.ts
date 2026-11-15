import {
  clientAddress,
  hostName,
  isAllowedHost,
  isHiddenPath,
  isReadMethod,
} from './request-guard';

describe('isReadMethod', () => {
  it('accepts only GET and HEAD', () => {
    expect(isReadMethod('GET')).toBe(true);
    expect(isReadMethod('HEAD')).toBe(true);
    expect(isReadMethod('POST')).toBe(false);
    expect(isReadMethod(undefined)).toBe(false);
  });
});

describe('hostName', () => {
  it('drops the port and lowercases the name', () => {
    expect(hostName('Marco.Figueroa-Sanchez.com:8080')).toBe('marco.figueroa-sanchez.com');
    expect(hostName('localhost')).toBe('localhost');
  });

  it('keeps IPv6 literals whole', () => {
    expect(hostName('[::1]:8080')).toBe('[::1]');
  });

  it('answers an empty string without a header', () => {
    expect(hostName(undefined)).toBe('');
  });
});

describe('isAllowedHost', () => {
  const allowed = ['marco.figueroa-sanchez.com', 'localhost'];

  it('accepts the listed hosts on any port', () => {
    expect(isAllowedHost('marco.figueroa-sanchez.com', allowed)).toBe(true);
    expect(isAllowedHost('localhost:4000', allowed)).toBe(true);
  });

  it('rejects other or missing hosts', () => {
    expect(isAllowedHost('10.0.0.5:8080', allowed)).toBe(false);
    expect(isAllowedHost('evil.example.com', allowed)).toBe(false);
    expect(isAllowedHost(undefined, allowed)).toBe(false);
  });
});

describe('isHiddenPath', () => {
  it('hides dotfiles anywhere in the path', () => {
    expect(isHiddenPath('/.env')).toBe(true);
    expect(isHiddenPath('/blog/.git/config')).toBe(true);
  });

  it('keeps /.well-known reachable', () => {
    expect(isHiddenPath('/.well-known/security.txt')).toBe(false);
  });

  it('hides source maps and editor or backup leftovers', () => {
    expect(isHiddenPath('/main-GAP437HP.js.map')).toBe(true);
    expect(isHiddenPath('/index.html.BAK')).toBe(true);
    expect(isHiddenPath('/notes.swp')).toBe(true);
  });

  it('allows regular pages and files', () => {
    expect(isHiddenPath('/')).toBe(false);
    expect(isHiddenPath('/blog/rss.xml')).toBe(false);
    expect(isHiddenPath('/main-GAP437HP.js')).toBe(false);
  });
});

describe('clientAddress', () => {
  it('uses the socket address of a direct client', () => {
    expect(clientAddress('203.0.113.7', '198.51.100.1')).toBe('203.0.113.7');
  });

  it('takes the last untrusted address forwarded by trusted proxies', () => {
    expect(clientAddress('10.1.2.3', '198.51.100.1, 203.0.113.9, 172.16.0.4')).toBe('203.0.113.9');
  });

  it('keeps the proxy address when every forwarded address is trusted', () => {
    expect(clientAddress('10.1.2.3', '192.168.1.1')).toBe('192.168.1.1');
  });

  it('reads IPv4 addresses mapped to IPv6', () => {
    expect(clientAddress('::ffff:10.1.2.3', '203.0.113.9')).toBe('203.0.113.9');
    expect(clientAddress('::ffff:203.0.113.7', undefined)).toBe('203.0.113.7');
  });

  it('answers an empty string without a socket address', () => {
    expect(clientAddress(undefined, undefined)).toBe('');
  });
});
