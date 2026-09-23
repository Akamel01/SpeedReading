import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractArticle } from '../src/lib/article.js';

const FIXTURE = `<!doctype html><html><head><title>Great Post — Example Blog</title>
<style>p{color:red}</style><script>track()</script></head>
<body><header>Site nav and logo</header><nav>links links</nav>
<article><h1>Great Post</h1>
<p>First paragraph with a <a href="/x">useful link</a> inside.</p>
<p>Second paragraph mentions fish &amp; chips.</p></article>
<aside>Related stories sidebar</aside><footer>Copyright footer</footer></body></html>`;

test('extractArticle prefers article content and drops chrome', () => {
  const { title, text } = extractArticle(FIXTURE);
  assert.equal(title, 'Great Post');
  assert.match(text, /First paragraph with a useful link inside\./);
  assert.match(text, /fish & chips/);
  assert.doesNotMatch(text, /Site nav|Related stories|Copyright footer/);
  assert.doesNotMatch(text, /track\(\)/);
});

test('extractArticle falls back to body text without article tag', () => {
  const { text } = extractArticle('<html><head><title>T</title></head><body><p>Just a short page with enough words to pass the threshold easily here.</p></body></html>');
  assert.match(text, /Just a short page/);
});

test('extractArticle handles empty and non-string input', () => {
  assert.deepEqual(extractArticle(''), { title: '', text: '' });
  assert.deepEqual(extractArticle(null), { title: '', text: '' });
});
