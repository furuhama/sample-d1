/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `wrangler dev src/index.ts` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `wrangler publish src/index.ts --name my-worker` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import type { D1Database, D1Result } from '@cloudflare/workers-types'

export interface Env {
  // Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
  // MY_KV_NAMESPACE: KVNamespace;
  //
  // Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
  // MY_DURABLE_OBJECT: DurableObjectNamespace;
  //
  // Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
  // MY_BUCKET: R2Bucket;
  DB: D1Database;
}

interface QueryResult {
  id: string,
  content: string,
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const { pathname } = new URL(request.url);
    const method = request.method;

    if (pathname === "/") {
      return this.root(env)
    }

    if (pathname === "/add" && method === "POST") {
      return this.add(request, env)
    }

    return this.not_found();
  },

  async root(env: Env) {
    const { results } = await env.DB.prepare("SELECT id, content FROM comment;").all<QueryResult>();
    console.log(results);
    return this.create_table(results!);
  },

  async add(request: Request, env: Env) {
    const content = (await request.formData()).get('content');
    await env.DB.prepare("INSERT INTO comment(content) VALUES (?);")
      .bind(content)
      .first<QueryResult>();
    return Response.redirect("https://sample-d1.furuhama.workers.dev/");
  },

  async not_found() {
    return new Response("Not found");
  },

  create_table(results: QueryResult[]) {
    const result_html = results.map(e => `
    <tr>
      <td>${e.id}</td>
      <td>${e.content}</td>
    </tr>
    `).join('')
    const html = `
    <!DOCTYPE html>
    <body>
      <h1>sample page with Cloudflare D1</h1>

      <h2>table schema</h2>
      <p>
      CREATE TABLE comment(id integer primary key, content text)
      </p>

      <h2>table contents</h2>
      <table>
        <thead>
          <tr>
            <td>id</td>
            <td>content</td>
          </tr>
        </thead>
        <tbody>
          ${result_html}
        </tbody>
      </table>

      <h2>add record</h2>
      <form action="/add" method="post">
        <label for="content">content</label>
        <input type="text" name="content" id="content" required>

        <input type="submit" value="submit">
      </form>
    </body>
    `;
    return new Response(html, { headers: { 'content-type': 'text/html;charset=utf-8', } });
  },
};
