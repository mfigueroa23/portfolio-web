import { readCookie, spanishRedirect } from './language-redirect';

describe('readCookie', () => {
  it('reads a cookie among others', () => {
    expect(readCookie('theme=dark; lang=en; x=1', 'lang')).toBe('en');
  });

  it('answers an empty string when the cookie or the header is missing', () => {
    expect(readCookie('theme=dark', 'lang')).toBe('');
    expect(readCookie(undefined, 'lang')).toBe('');
  });

  it('does not match a cookie whose name only ends with the given one', () => {
    expect(readCookie('xlang=es', 'lang')).toBe('');
  });
});

describe('spanishRedirect', () => {
  it('sends a first visit in Spanish to the Spanish page, keeping the query', () => {
    expect(spanishRedirect('/projects', '/projects?page=2', undefined, 'es-CL,es;q=0.9')).toBe(
      '/es/projects?page=2',
    );
  });

  it('sends the English home to the canonical Spanish home', () => {
    expect(spanishRedirect('/', '/', undefined, 'es')).toBe('/es');
  });

  it('accepts any variant of Spanish as the first language, in any case', () => {
    expect(spanishRedirect('/blog', '/blog', undefined, 'ES-419')).toBe('/es/blog');
    expect(spanishRedirect('/blog', '/blog', undefined, ' es;q=1')).toBe('/es/blog');
  });

  it('does not redirect when Spanish is not the first language', () => {
    expect(spanishRedirect('/', '/', undefined, 'en-US,es;q=0.9')).toBeNull();
    expect(spanishRedirect('/', '/', undefined, 'eso')).toBeNull();
    expect(spanishRedirect('/', '/', undefined, undefined)).toBeNull();
  });

  it('respects a remembered language choice', () => {
    expect(spanishRedirect('/', '/', 'lang=en', 'es')).toBeNull();
  });

  it('never redirects the feed, Spanish pages or files', () => {
    expect(spanishRedirect('/blog/rss.xml', '/blog/rss.xml', undefined, 'es')).toBeNull();
    expect(spanishRedirect('/es', '/es', undefined, 'es')).toBeNull();
    expect(spanishRedirect('/robots.txt', '/robots.txt', undefined, 'es')).toBeNull();
  });
});
