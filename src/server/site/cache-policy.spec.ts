import { cacheControl, isLanguageRedirectable, languageVary } from './cache-policy';

describe('cacheControl', () => {
  it('keeps the English home private, since it depends on the language redirect', () => {
    expect(cacheControl('/')).toBe('private, no-cache');
    expect(cacheControl('/index.html')).toBe('private, no-cache');
  });

  it('keeps the English content pages private', () => {
    expect(cacheControl('/projects')).toBe('private, no-cache');
    expect(cacheControl('/experience')).toBe('private, no-cache');
    expect(cacheControl('/blog/some-post')).toBe('private, no-cache');
  });

  it('revalidates the feeds, the Spanish pages and any HTML file', () => {
    expect(cacheControl('/blog/rss.xml')).toBe('no-cache');
    expect(cacheControl('/es')).toBe('no-cache');
    expect(cacheControl('/es/blog/rss.xml')).toBe('no-cache');
    expect(cacheControl('/index.csr.html')).toBe('no-cache');
  });

  it('caches hashed scripts and styles for a year', () => {
    const immutable = 'public, max-age=31536000, immutable';
    expect(cacheControl('/main-GAP437HP.js')).toBe(immutable);
    expect(cacheControl('/styles-TU2XFZJC.css')).toBe(immutable);
    expect(cacheControl('/chunk-Cmd-Hwha.js')).toBe(immutable);
    expect(cacheControl('/chunk-_AFunBDQ.js')).toBe(immutable);
  });

  it('caches any other file for a day', () => {
    expect(cacheControl('/favicon.ico')).toBe('public, max-age=86400');
    expect(cacheControl('/projectsx')).toBe('public, max-age=86400');
  });
});

describe('isLanguageRedirectable', () => {
  it('accepts the English home and content pages', () => {
    expect(isLanguageRedirectable('/')).toBe(true);
    expect(isLanguageRedirectable('/projects')).toBe(true);
    expect(isLanguageRedirectable('/blog/tag/angular')).toBe(true);
  });

  it('rejects the feed, Spanish pages, files and assets', () => {
    expect(isLanguageRedirectable('/blog/rss.xml')).toBe(false);
    expect(isLanguageRedirectable('/es/projects')).toBe(false);
    expect(isLanguageRedirectable('/robots.txt')).toBe(false);
    expect(isLanguageRedirectable('/main-GAP437HP.js')).toBe(false);
  });
});

describe('languageVary', () => {
  it('varies redirectable pages by language preference and cookie', () => {
    expect(languageVary('/')).toBe('Accept-Language, Cookie');
  });

  it('adds nothing for any other path', () => {
    expect(languageVary('/es')).toBeNull();
  });
});
