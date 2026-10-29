const https=require('https');
module.exports=function engineClient({host,token,peerIp}) {
 return payload=>new Promise((resolve,reject)=>{
  const body=JSON.stringify(payload);
  const req=https.request({hostname:host,path:'/play',method:'POST',headers:{authorization:token,'x-real-ip':peerIp,
   'content-type':'application/json','content-length':Buffer.byteLength(body)}},res=>{
    let text='';res.setEncoding('utf8');res.on('error',reject);
    res.on('data',chunk=>{text+=chunk;if(text.length>16384)req.destroy(new Error('Engine reply too large'));});
    res.on('end',()=>{try {if(res.statusCode!==200)throw new Error('Engine unavailable: '+res.statusCode);resolve(JSON.parse(text));}catch(error){reject(error);}});
  });
  req.on('error',reject);req.setTimeout(10000,()=>req.destroy(new Error('Bot engine timeout')));req.end(body);
 });
};
