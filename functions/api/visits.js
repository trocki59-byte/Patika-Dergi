export async function onRequestPost({request,env}) {
 if(!env.VISITS_DB)return Response.json({error:'D1 binding VISITS_DB missing'},{status:503});
 let data;try{data=await request.json()}catch{return Response.json({error:'Invalid JSON'},{status:400})}
 const session=data?.session;
 if(typeof session!=='string'||! /^[a-f0-9-]{36}$/i.test(session))return Response.json({error:'Invalid session'},{status:400});
 const today=new Date().toLocaleDateString('en-CA',{timeZone:'Europe/Istanbul'});
 // Same session counted only once per calendar day; session identifiers are not stored beyond 2 days.
 try{
  await env.VISITS_DB.prepare('INSERT OR IGNORE INTO visitor_sessions (day,session) VALUES (?,?)').bind(today,session).run();
  const [total,daily]=await env.VISITS_DB.batch([
   env.VISITS_DB.prepare('SELECT COUNT(*) AS n FROM visitor_sessions'),
   env.VISITS_DB.prepare('SELECT COUNT(*) AS n FROM visitor_sessions WHERE day=?').bind(today)
  ]);
  return Response.json({total:total.results[0].n,today:daily.results[0].n},{headers:{'Cache-Control':'no-store'}})
 }catch(e){return Response.json({error:'Database not initialized'},{status:503})}
}
export async function onRequestGet({env}) {
 if(!env.VISITS_DB)return Response.json({error:'D1 binding VISITS_DB missing'},{status:503});
 const today=new Date().toLocaleDateString('en-CA',{timeZone:'Europe/Istanbul'});
 try{const [a,b]=await env.VISITS_DB.batch([env.VISITS_DB.prepare('SELECT COUNT(*) AS n FROM visitor_sessions'),env.VISITS_DB.prepare('SELECT COUNT(*) AS n FROM visitor_sessions WHERE day=?').bind(today)]);return Response.json({total:a.results[0].n,today:b.results[0].n},{headers:{'Cache-Control':'no-store'}})}catch{return Response.json({error:'Database not initialized'},{status:503})}
}
