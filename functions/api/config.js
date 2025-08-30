// functions/api/config.js
export async function onRequestGet({ env }) {
const tags = (env.PUBLIC_TAGS || 'Top,AI,Technology,Finance,Science,Sports').split(',').map(s => s.trim()).filter(Boolean);
return new Response(JSON.stringify({ tags }), {
headers: { 'content-type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=600' },
});
}