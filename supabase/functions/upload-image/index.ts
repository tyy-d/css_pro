import { createClient } from 'npm:@supabase/supabase-js@2';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods':'POST, OPTIONS' };
Deno.serve(async (req: Request) => {
 if(req.method==='OPTIONS') return new Response('ok',{headers:cors});
 try {
  if(req.method!=='POST')throw new Error('POST required');
  const url=Deno.env.get('SUPABASE_URL')!;
  const caller=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:req.headers.get('Authorization')||''}}});
  const {data:{user},error:authError}=await caller.auth.getUser();if(authError||!user)throw new Error('Sign in to upload');
  const admin=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const {data:profile}=await admin.from('profiles').select('suspended').eq('id',user.id).single();if(!profile||profile.suspended)throw new Error('Account unavailable');
  if(Number(req.headers.get('content-length')||0)>11*1024*1024)throw new Error('Upload too large');
  const form=await req.formData();const file=form.get('file');const designId=String(form.get('designId')||'');
  if(!(file instanceof File)||!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>10*1024*1024)throw new Error('Use PNG, JPEG, or WebP images under 10 MB');
  const {data:design}=await admin.from('designs').select('owner_id,status').eq('id',designId).single();if(!design||design.owner_id!==user.id||design.status==='hidden')throw new Error('You can only upload to your own editable designs');
  const b=new Uint8Array(await file.arrayBuffer());
  const valid=(file.type==='image/png'&&b[0]===137&&b[1]===80&&b[2]===78&&b[3]===71)||(file.type==='image/jpeg'&&b[0]===255&&b[1]===216&&b[2]===255)||(file.type==='image/webp'&&String.fromCharCode(...b.slice(0,4))==='RIFF'&&String.fromCharCode(...b.slice(8,12))==='WEBP');
  if(!valid)throw new Error('The file contents do not match its image type');
  const id=crypto.randomUUID();const name=`${id.slice(0,8)}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;const path=`${designId}/${name}`;
  // reserve_upload serializes quota reservations for concurrent uploads to this design.
  const {error:reserveError}=await caller.rpc('reserve_upload',{target:designId,object_path:path,byte_count:file.size});if(reserveError)throw reserveError;
  const {error}=await admin.storage.from('design-assets').upload(path,b,{contentType:file.type});
  if(error){await admin.from('upload_reservations').delete().eq('path',path);throw error;}
  return Response.json({id,name,path},{headers:cors});
 } catch(e) { return Response.json({error:e instanceof Error?e.message:'Upload failed'},{status:400,headers:cors}); }
});
