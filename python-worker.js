let pyodideReady=null;
async function getPyodide(){if(!pyodideReady){importScripts('https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.js');pyodideReady=loadPyodide({indexURL:'https://cdn.jsdelivr.net/pyodide/v0.27.7/full/'});}return pyodideReady}
self.onmessage=async(e)=>{const {id,code,functionName,tests,forbidden=[]}=e.data;try{const bad=['import ','from ','open(','exec(','eval(','compile(','__import__','globals(','locals(','vars(','__'].concat(forbidden||[]).find(x=>code.includes(x));if(bad)throw new Error('Запрещённая конструкция: '+bad);const py=await getPyodide();py.globals.set('KOD8_CODE',code);py.globals.set('KOD8_FN',functionName);py.globals.set('KOD8_TESTS',JSON.stringify(tests));const out=await py.runPythonAsync(`
import json, math, contextlib, io
code=KOD8_CODE
fn_name=KOD8_FN
tests=json.loads(KOD8_TESTS)
env={}
stdout=io.StringIO()
with contextlib.redirect_stdout(stdout):
    exec(code, env)
if fn_name not in env or not callable(env[fn_name]):
    raise Exception(f'Не найдена функция {fn_name}')
fn=env[fn_name]
def same(a,b):
    if isinstance(a,float) or isinstance(b,float):
        try:return abs(float(a)-float(b)) < 1e-7
        except:return False
    if isinstance(a,(list,tuple)) and isinstance(b,(list,tuple)):
        return len(a)==len(b) and all(same(x,y) for x,y in zip(a,b))
    if isinstance(a,dict) and isinstance(b,dict):
        return a.keys()==b.keys() and all(same(a[k],b[k]) for k in a)
    return a==b
rows=[]
for t in tests:
    try:
        result=fn(*t['args'])
        ok=same(result,t['expected'])
        rows.append({'ok':ok,'result':repr(result),'expected':repr(t['expected'])})
    except Exception as ex:
        rows.append({'ok':False,'error':type(ex).__name__+': '+str(ex),'expected':repr(t['expected'])})
json.dumps({'rows':rows,'stdout':stdout.getvalue()})
`);postMessage({id,ok:true,result:JSON.parse(out)})}catch(err){postMessage({id,ok:false,error:String(err&&err.message||err)})}}