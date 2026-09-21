import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
process.loadEnvFile('.env');
const fixtures=JSON.parse(await readFile('/tmp/nexzza-live-test.json','utf8'));
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const clients={};const tokens={};const checks=[];
function pass(name){checks.push(name);console.log('PASS '+name);}
async function command(client,action,p={}){const{data,error}=await client.rpc('nexzza',{action,p});if(error)throw new Error(action+': '+error.message);return data;}
for(const account of fixtures.accounts){
 const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const{data,error}=await client.auth.signInWithPassword({email:account.email,password:fixtures.password});
 assert.equal(error,null);assert.equal(data.user.id,account.id);clients[account.role]=client;tokens[account.role]=data.session.access_token;
}
pass('Real email/password sign-in for two players and a moderator');
fixtures.createdConversations=[];fixtures.uploads=[];
async function save(){await writeFile('/tmp/nexzza-live-test.json',JSON.stringify(fixtures));}
const a=clients.a,b=clients.b,mod=clients.mod;
const direct=await command(a,'conversation_create',{kind:'direct',username:fixtures.accounts.find(x=>x.role==='b').username});fixtures.createdConversations.push(direct.id);await save();
const invite=await b.from('conversation_invites').select('id,profiles!conversation_invites_sender_id_fkey(*)').eq('conversation_id',direct.id).single();assert.equal(invite.error,null);
await command(b,'invite_respond',{id:invite.data.id,accept:true});
const foreign=await mod.from('conversations').select('id').eq('id',direct.id);assert.equal(foreign.error,null);assert.equal(foreign.data.length,0);
pass('Live invitations, acceptance, profile relationship and private access');
const message=await command(a,'message_send',{conversation_id:direct.id,content:'Temporary NEXZZA QA message',client_id:randomUUID(),reply_to:null,attachments:[]});
const read=await b.from('messages').select('*,profiles!messages_author_id_fkey(*),message_attachments(media_assets(id,mime,filename,size)),message_reactions(emoji,user_id),message_receipts(user_id,read_at)').eq('id',message.id).single();assert.equal(read.error,null);
await command(b,'receipt',{conversation_id:direct.id,read:true});
pass('Live messages, embedded media query and read receipts');
for(const [label,query] of [
 ['Presence profile relationship',a.from('user_presence').select('profiles!inner(*)')],
 ['Staff profile-role relationship',mod.from('profiles').select('*,user_roles!user_roles_user_id_fkey(*)')],
 ['News feed',a.rpc('news_feed',{p:{tab:'latest',limit:18}})],
 ['Community settings visibility',mod.from('community_settings').select('*')],
 ['Unread message aggregate',b.rpc('unread_counts')]
]){const result=await query;assert.equal(result.error,null,label);pass(label);}
const channel=b.channel('qa-'+randomUUID()).on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:'conversation_id=eq.'+direct.id},()=>receivedResolve(true));
let receivedResolve;const received=new Promise(resolve=>{receivedResolve=resolve;});
await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Realtime subscription timed out')),12000);channel.subscribe(status=>{if(status==='SUBSCRIBED'){clearTimeout(timer);resolve();}if(status==='CHANNEL_ERROR'){clearTimeout(timer);reject(new Error('Realtime subscription failed'));}});});
await command(a,'message_send',{conversation_id:direct.id,content:'Temporary realtime QA',client_id:randomUUID(),attachments:[],reply_to:null});
assert.equal(await Promise.race([received,new Promise(resolve=>setTimeout(()=>resolve(false),10000))]),true);
await b.removeChannel(channel);pass('Live realtime delivery between two authenticated players');
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6KQAAAABJRU5ErkJggg==','base64');
const upload=await fetch(url+'/functions/v1/nexzza-media/upload',{method:'POST',headers:{Authorization:'Bearer '+tokens.a,apikey:key,'Content-Type':'image/png','X-File-Name':'qa.png','X-File-Size':String(png.length),'X-File-Scope':'avatar'},body:png});
const asset=await upload.json();assert.equal(upload.status,200,JSON.stringify(asset));fixtures.uploads.push(asset.id);await save();pass('Validated upload through the deployed media function');
const own=await fetch(url+'/functions/v1/nexzza-media/sign/'+asset.id,{headers:{Authorization:'Bearer '+tokens.a,apikey:key}});assert.equal(own.status,200);const signed=await own.json();const file=await fetch(signed.url);assert.equal(file.status,200);assert.equal((await file.arrayBuffer()).byteLength,png.length);pass('Private signed file can be retrieved by its owner');
const other=await fetch(url+'/functions/v1/nexzza-media/sign/'+asset.id,{headers:{Authorization:'Bearer '+tokens.b,apikey:key}});assert.equal(other.status,404);pass('Another player cannot open a pending private upload');
const forged=await fetch(url+'/functions/v1/nexzza-media/upload',{method:'POST',headers:{Authorization:'Bearer '+tokens.a,apikey:key,'Content-Type':'image/png','X-File-Name':'fake.png','X-File-Size':'22','X-File-Scope':'avatar'},body:'This is not a PNG file.'});assert.equal(forged.status,400);pass('Spoofed image bytes are rejected');
const remove=await fetch(url+'/functions/v1/nexzza-media/asset/'+asset.id,{method:'DELETE',headers:{Authorization:'Bearer '+tokens.a,apikey:key}});assert.equal(remove.status,200);fixtures.uploads=[];await save();pass('Unused test upload removed from storage');
for(const client of Object.values(clients))await client.auth.signOut();
await writeFile('/tmp/nexzza-live-results.json',JSON.stringify({passed:checks.length,checks},null,2));console.log('Live checks passed: '+checks.length);
