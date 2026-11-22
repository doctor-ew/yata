// Contract-derived synthetic scenarios. Never forwards to the deployed service.
const http=require('http');
http.createServer(async(req,res)=>{
 const send=(status,body)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(body));};
 let text='';for await(const chunk of req){text+=chunk;if(text.length>16384)return send(400,{error:'Invalid request.'});}
 let body;try{body=req.body===undefined?JSON.parse(text):typeof req.body==='string'?JSON.parse(req.body):req.body;}catch{return send(400,{error:'Invalid JSON.'});}
 if(req.method!=='POST')return send(501,{error:'Not modeled.'});
 if(req.url==='/session')return send(200,{sessionToken:'synthetic-feedback-grant',expiresAt:Date.now()/1000+1800});
 if(req.url!=='/chatbot')return send(501,{error:'Not modeled.'});
 if(body.sessionToken!=='synthetic-feedback-grant')return send(401,{error:'Verification required.'});
 if(body.mode!=='feedback'||typeof body.question!=='string'||typeof body.personality!=='string'||Object.keys(body).some(k=>!['sessionToken','mode','question','personality'].includes(k)))return send(400,{error:'Invalid feedback envelope.'});
 let report;try{report=JSON.parse(body.question);}catch{return send(400,{error:'Invalid report.'});}
 if(report.version!==1||!Array.isArray(report.messages)||!report.messages.length||report.messages.length>6)return send(400,{error:'Invalid report.'});
 const scenario=req.headers['x-fixture-scenario']||'ready';
 if(scenario==='error')return send(503,{error:'Synthetic outage.'});
 if(scenario==='invalid')return send(200,{assessment:{version:1,status:'assessed',kind:'bug',next:'execute',confidence:.99,url:'https://invalid.example'}});
 if(scenario==='unavailable')return send(200,{assessment:{version:1,status:'unavailable',kind:'other',next:'clarify',confidence:0}});
 if(scenario==='delayed')await new Promise(resolve=>setTimeout(resolve,1000));
 const next=scenario==='actual'?'actual':scenario==='action'?'action':'ready';
 return send(200,{assessment:{version:1,status:'assessed',kind:'bug',next,confidence:.98}});
}).listen(process.env.PORT||4500);
