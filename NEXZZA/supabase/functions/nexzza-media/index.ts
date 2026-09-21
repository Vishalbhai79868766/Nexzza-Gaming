import { createClient } from 'npm:@supabase/supabase-js@2.116.0';
import { validateFile, validSignature } from './files.ts';
const respond=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
Deno.serve(async (req:Request)=>{
  const endpoint=new URL(req.url).pathname;
  const url=Deno.env.get('SUPABASE_URL')!;
  const anon=Deno.env.get('SUPABASE_ANON_KEY')!;
  const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const authorization=req.headers.get('authorization')||'';
  const userClient=createClient(url,anon,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  let uploaded:{bucket:string;path:string}|null=null;
  try{
    const {data:{user},error}=await userClient.auth.getUser(authorization.replace(/^Bearer /i,''));
    if(error||!user?.email_confirmed_at)return respond({error:'Sign in with a verified email.'},401);
    const active=await userClient.rpc('active_player');
    if(!active.data)return respond({error:'Account unavailable.'},403);

    if(req.method==='GET'&&endpoint.includes('/report-media/')){
      const isStaff=await userClient.rpc('staff');
      if(!isStaff.data)return respond({error:'Permission denied.'},403);
      const rid=endpoint.split('/report-media/')[1];
      const report=await userClient.from('reports').select('target_type,target_id,status').eq('id',rid).single();
      if(report.error)return respond({error:'Report unavailable.'},404);
      if(report.data.target_type!=='message'||!['open','under_review'].includes(report.data.status))return respond([]);
      const links=await admin.from('message_attachments').select('asset_id').eq('message_id',report.data.target_id);
      if(links.error)throw new Error('Could not load report attachments.');
      const ids=links.data.map(a=>a.asset_id);
      if(!ids.length)return respond([]);
      const assets=await userClient.from('media_assets').select('id,mime,filename,size').in('id',ids);
      if(assets.error)throw new Error('Report attachments unavailable.');
      return respond(assets.data);
    }
    if(req.method==='DELETE'&&endpoint.includes('/asset/')){
      const id=endpoint.split('/asset/')[1];
      const a=await userClient.from('media_assets').select('id,bucket,path,attached').eq('id',id).eq('owner_id',user.id).single();
      if(a.error||a.data.attached)return respond({error:'Only your unused uploads can be discarded.'},403);
      const deleted=await admin.storage.from(a.data.bucket).remove([a.data.path]);
      if(deleted.error)throw new Error('Could not discard this upload.');
      await admin.from('media_assets').delete().eq('id',id).eq('owner_id',user.id).eq('attached',false);
      return respond({ok:true});
    }
    if(req.method==='GET'&&endpoint.includes('/sign/')){
      const id=endpoint.split('/sign/')[1];
      if(!/^[0-9a-f-]{36}$/.test(id))return respond({error:'Not found.'},404);
      const asset=await userClient.from('media_assets').select('bucket,path,mime,filename').eq('id',id).single();
      if(asset.error||!asset.data)return respond({error:'File unavailable.'},404);
      const a=asset.data;
      const signed=await admin.storage.from(a.bucket).createSignedUrl(a.path,60,/^(image|audio|video)\//.test(a.mime)?{}:{download:a.filename});
      if(signed.error)throw new Error('Could not open this file.');
      return respond({url:signed.data.signedUrl});
    }
    if(req.method!=='POST'||!endpoint.endsWith('/upload'))return respond({error:'Not found.'},404);
    const quota=await userClient.rpc('nexzza',{action:'upload',p:{}});
    if(quota.error)throw new Error(quota.error.message);
    const filename=decodeURIComponent(req.headers.get('x-file-name')||'').replace(/[\x00-\x1f/\\]/g,'_').slice(0,160);
    const mime=(req.headers.get('content-type')||'').split(';')[0].toLowerCase();
    const size=Number(req.headers.get('x-file-size'));
    const scope=req.headers.get('x-file-scope')||'';
    const conversation_id=req.headers.get('x-conversation-id')||null;
    const post_id=req.headers.get('x-post-id')||null;
    if(!Number.isSafeInteger(size))throw new Error('Invalid file size.');
    validateFile(filename,mime,size,scope);
    let bucket='avatars';
    if(scope==='news'){
      if(!post_id||!/^[0-9a-f-]{36}$/.test(post_id))throw new Error('Choose an article for this upload.');
      const existing=await admin.from('news_posts').select('author_id,state').eq('id',post_id).maybeSingle();
      if(existing.error||(existing.data&&(existing.data.author_id!==user.id||existing.data.state!=='published')))throw new Error('Article unavailable.');
      bucket='news-media';
    }
    if(scope==='chat'||scope==='group'){
      if(!conversation_id||!/^[0-9a-f-]{36}$/.test(conversation_id))throw new Error('Choose a conversation.');
      const c=await userClient.from('conversations').select('kind,owner_id').eq('id',conversation_id).single();
      if(c.error)throw new Error('Conversation unavailable.');
      if(scope==='group'&&(c.data.kind!=='group'||c.data.owner_id!==user.id))throw new Error('Only the group owner can update its icon.');
      bucket=scope==='group'?'avatars':mime.startsWith('audio/')?'voice-recordings':c.data.kind==='global'?'global-attachments':'private-attachments';
    }
    if(!req.body)throw new Error('No file received.');
    const reader=req.body.getReader();
    let prefix=new Uint8Array(0);
    while(prefix.length<512){const part=await reader.read();if(part.done)break;const combined=new Uint8Array(prefix.length+part.value.length);combined.set(prefix);combined.set(part.value,prefix.length);prefix=combined;if(prefix.length>size)throw new Error('File size did not match.');}
    if(!validSignature(prefix.subarray(0,512),mime))throw new Error('The file contents do not match its type.');
    let count=prefix.length;
    const body=new ReadableStream<Uint8Array>({
      start(controller){controller.enqueue(prefix);},
      async pull(controller){try{const part=await reader.read();if(part.done){if(count!==size)throw new Error('File size did not match.');controller.close();return;}count+=part.value.length;if(count>size)throw new Error('File exceeds its declared size.');controller.enqueue(part.value);}catch(e){await reader.cancel();controller.error(e);}},
      cancel(){return reader.cancel();}
    });
    const id=crypto.randomUUID();
    const extension=filename.split('.').pop()!.toLowerCase();
    const path=user.id+'/'+id+'.'+extension;
    const upload=await fetch(url+'/storage/v1/object/'+bucket+'/'+path,{method:'POST',headers:{Authorization:'Bearer '+service,apikey:service,'Content-Type':mime,'x-upsert':'false'},body});
    if(!upload.ok)throw new Error('Upload failed. Please try again.');
    uploaded={bucket,path};
    const stillActive=await userClient.rpc('active_player');
    if(!stillActive.data)throw new Error('Account unavailable.');
    if(conversation_id){const check=await userClient.rpc('can_converse',{cid:conversation_id});if(!check.data)throw new Error('Conversation access changed.');}
    const saved=await admin.from('media_assets').insert({id,owner_id:user.id,bucket,path,mime,filename,size,scope,conversation_id,post_id}).select('id,mime,filename,size').single();
    if(saved.error)throw new Error('Could not save the attachment.');
    uploaded=null;
    return respond(saved.data);
  }catch(e){if(uploaded)await admin.storage.from(uploaded.bucket).remove([uploaded.path]);return respond({error:e instanceof Error?e.message:'File unavailable.'},400);}
});