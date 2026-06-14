export class HttpSource {
  constructor(baseUrl) {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
  }

  async loadManifest() {
    const res = await fetch(this.baseUrl + 'books/books.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error('manifest ' + res.status);
    const data = await res.json();
    return data.books || [];
  }

  async loadBook(id) {
    const res = await fetch(this.baseUrl + 'books/' + encodeURIComponent(id) + '.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error('book ' + id + ' ' + res.status);
    return res.json();
  }
}
