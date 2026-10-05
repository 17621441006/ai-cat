import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,readFile} from 'node:fs/promises';
const require=createRequire(import.meta.url);
const {build}=createRequire(require.resolve('wrangler/package.json'))('esbuild');
await mkdir(new URL('../work/',import.meta.url),{recursive:true});
await build({entryPoints:['lib/agent-workshop.ts'],bundle:true,platform:'node',format:'esm',packages:'external',outfile:'work/agent-workshop-test.mjs',logLevel:'silent'});
const {exampleGraph,graphSchema,graphProblems,executeWorkflow,runAutomatically,assessWorkshop,newNode}=await import('../work/agent-workshop-test.mjs');

test('normal order combines three systems and follows only the normal branch',()=>{
 const graph=exampleGraph(),result=runAutomatically(graph,'normal');assert.equal(result.status,'complete');assert.deepEqual(Object.keys(result.data.evidence).sort(),['ERP','MES','TMS']);assert.equal(result.data.estimatedDays,2);assert.equal(result.data.review,false);assert.equal(result.steps.find(s=>s.nodeId==='approval').state,'skipped');assert.match(result.text,/SO-260901/);assert.equal(assessWorkshop(graph).every(c=>c.passed),true);
});
test('manual review pauses execution and resumes with the human decision',()=>{
 for(const decision of [true,false]){const generator=executeWorkflow(exampleGraph(),'delay');let next=generator.next(),paused=false;while(!next.done){if(next.value.type==='step'&&next.value.step.state==='waiting'){assert.equal(next.value.step.output.lateDays,2);assert.equal(next.value.step.output.evidence.ERP.reference,'ERP/SO-260902');paused=true;next=generator.next(decision)}else next=generator.next()}assert.equal(paused,true);assert.equal(next.value.data.decision,decision?'confirmed':'rejected');assert.equal(next.value.data.review,true);assert.match(next.value.text,decision?/人工已确认/:/人工已退回/)}
});
test('offline and unauthorized systems remain unknown, with safe fallback or explicit stop',()=>{
 const result=runAutomatically(exampleGraph(),'outage');assert.equal(result.status,'complete');assert.equal(result.data.evidence.TMS,undefined);assert.equal(result.data.estimatedDays,undefined);assert.equal(result.data.review,true);assert.equal(result.data.decision,'rejected');assert.match(result.text,/未知/);
 const graph=exampleGraph();graph.nodes.find(n=>n.id==='tms').data.permission='none';const forbidden=runAutomatically(graph,'normal');assert.match(forbidden.data.warnings.join(' '),/未获授权/);assert.equal(forbidden.data.evidence.TMS,undefined);
 graph.nodes.find(n=>n.id==='tms').data.fallback='stop';assert.equal(runAutomatically(graph,'normal').status,'error');
});
test('parallel concurrency changes execution waves while preserving results',()=>{
 const graph=exampleGraph();const parallel=runAutomatically(graph,'normal');graph.nodes.find(n=>n.id==='dispatch').data.mode='sequential';const sequential=runAutomatically(graph,'normal');assert.equal(sequential.waves,parallel.waves+2);assert.equal(parallel.data.estimatedDays,sequential.data.estimatedDays);const agents=parallel.steps.filter(s=>s.kind==='agent');assert.equal(new Set(agents.map(s=>s.wave)).size,1);
 graph.nodes.find(n=>n.id==='dispatch').data.mode='parallel';graph.nodes.find(n=>n.id==='dispatch').data.parallel=2;assert.equal(runAutomatically(graph,'normal').waves,parallel.waves+1);
});
test('thresholds, skills, and branch wiring materially change the result',()=>{
 const graph=exampleGraph();graph.nodes.find(n=>n.id==='condition').data.threshold=3;assert.equal(runAutomatically(graph,'delay').data.review,false);assert.equal(assessWorkshop(graph).find(c=>c.id==='delay').passed,false);
 graph.nodes.find(n=>n.id==='skill').data.buffer=1;assert.equal(runAutomatically(graph,'normal').data.estimatedDays,3);
 const bypass=exampleGraph();bypass.edges=bypass.edges.filter(e=>e.source!=='approval');bypass.nodes=bypass.nodes.filter(n=>n.id!=='approval');bypass.edges.find(e=>e.sourceHandle==='review').target='output';assert.equal(runAutomatically(bypass,'delay').data.decision,undefined);assert.equal(assessWorkshop(bypass).find(c=>c.id==='delay').passed,false);
});
test('added knowledge, plugin and MCP nodes execute along their real edges',()=>{
 const graph=exampleGraph();const knowledge=newNode('knowledge','policy');knowledge.data.policy='conservative';graph.nodes.push(knowledge);graph.edges.find(e=>e.source==='merge').target='policy';graph.edges.push({id:'policy-skill',source:'policy',target:'skill',sourceHandle:'out'});
 const plugin=newNode('plugin','report');graph.nodes.push(plugin);graph.edges.find(e=>e.sourceHandle==='normal').target='report';graph.edges.push({id:'report-out',source:'report',target:'output',sourceHandle:'out'});const result=runAutomatically(graph,'normal');assert.equal(result.data.estimatedDays,3);assert.equal(result.data.attachment,true);
 graph.nodes.find(n=>n.id==='tms').data.kind='mcp';const mcp=runAutomatically(graph,'normal').steps.find(s=>s.nodeId==='tms');assert.deepEqual(mcp.protocol.map(p=>p.method),['server/discover','tools/list','tools/call']);assert.equal(mcp.protocol[2].params.arguments.order_id,'SO-260901');
});
test('broken, cyclic and disconnected graphs fail before execution',()=>{
 const cycle=exampleGraph();cycle.edges.push({id:'cycle',source:'merge',target:'dispatch',sourceHandle:'out'});assert.match(graphProblems(cycle).join(' '),/循环/);assert.equal(runAutomatically(cycle,'normal').steps.length,0);
 const orphan=exampleGraph();orphan.nodes.push(newNode('mcp','orphan'));assert.match(graphProblems(orphan).join(' '),/尚未接入/);
 const missing=exampleGraph();missing.edges=missing.edges.filter(e=>e.sourceHandle!=='review');assert.match(graphProblems(missing).join(' '),/复核.*出口/);
 const duplicate=exampleGraph();duplicate.edges.push({...duplicate.edges[0]});assert.match(graphProblems(duplicate).join(' '),/编号重复/);
});
test('challenge requires repairing both faults; importing rejects malformed or oversized graphs',()=>{
 const graph=exampleGraph(true);assert.equal(assessWorkshop(graph).every(c=>c.passed),false);graph.nodes.find(n=>n.id==='tms').data.connected=true;assert.equal(assessWorkshop(graph).find(c=>c.id==='delay').passed,false);graph.nodes.find(n=>n.id==='condition').data.threshold=0;assert.equal(assessWorkshop(graph).every(c=>c.passed),true);
 assert.equal(graphSchema.safeParse({...graph,nodes:Array(31).fill(graph.nodes[0])}).success,false);assert.equal(graphSchema.safeParse({...graph,nodes:[{...graph.nodes[0],data:{...graph.nodes[0].data,system:'https://evil.example'}}]}).success,false);
});
test('cancellation does not continue into output',()=>{
 const generator=executeWorkflow(exampleGraph(),'delay');let next=generator.next();while(!next.done&&!(next.value.type==='step'&&next.value.step.state==='waiting'))next=generator.next();assert.equal(next.done,false);generator.return();assert.equal(generator.next(true).done,true);
});

await build({stdin:{contents:`export {GET,POST} from './app/api/workshop-progress/route';export {setUser,setUnavailable} from './tests/fixtures/workshop-server.mjs';`,resolveDir:process.cwd()},plugins:[{name:'isolated-database',setup(b){b.onResolve({filter:/^@\/(app\/chatgpt-auth|db\/workshop)$/},()=>({path:process.cwd()+'/tests/fixtures/workshop-server.mjs'}))}}],bundle:true,platform:'node',format:'esm',packages:'external',outfile:'work/agent-progress-api-test.mjs',logLevel:'silent'});
const api=await import('../work/agent-progress-api-test.mjs');
const request=(body,origin='https://lesson.example')=>new Request('https://lesson.example/api/workshop-progress',{method:'POST',headers:{'Content-Type':'application/json','Origin':origin},body:JSON.stringify(body)});
test('completion is graded on the server, persisted, and isolated by signed-in user',async()=>{
 const body={graph:exampleGraph(),quiz:{mcp:'protocol',skill:'procedure'}};
 api.setUser(null);assert.equal((await api.POST(request(body))).status,401);assert.equal((await api.GET()).status,401);
 api.setUser({userId:'learner-a'});assert.equal((await api.POST(request(body,'https://elsewhere.example'))).status,403);
 assert.equal((await api.POST(request(null))).status,400);
 assert.equal((await api.POST(request({...body,graph:exampleGraph(true)}))).status,422);
 assert.equal((await api.POST(request({...body,quiz:{mcp:'model',skill:'procedure'}}))).status,422);
 assert.equal((await api.GET()).status,200);assert.equal((await (await api.GET()).json()).completedAt,null);
 const saved=await api.POST(request({...body,userId:'learner-b'}));assert.equal(saved.status,200);const completedAt=(await saved.json()).completedAt;assert.ok(completedAt>0);assert.equal((await (await api.GET()).json()).completedAt,completedAt);
 api.setUser({userId:'learner-b'});assert.equal((await (await api.GET()).json()).completedAt,null);
 api.setUser({userId:'learner-a'});assert.equal((await api.POST(request(body))).status,200);
});
