"use strict";
var commands = [];
var log = document.getElementById('log');
var i = -1;
var fixpos=false;
var scriptfile = 'commands.js';

var nodes = new vis.DataSet([]); // вершины графа
var edges = new vis.DataSet([]); // рёбра графа
var network

var button = document.getElementById('next');
var message = document.getElementById('message');
var container = document.getElementById('mynetwork');

function undo() {
    if (busy) return;
    if (undoStack.length == 0) return;
    let f = undoStack.pop();
    while (f===emptyAction) {
        f = undoStack.pop();
        step--;
    }
    f();
    step--;
    log.value = step;
}

function addNode(id) {
    nodes.add({ id: id, label: id });
}
let step = -1;
let busy=false,  pause=false;

function setpause() {
    pause=true;
}

function emptyAction() {

}

async function play() {
    pause=false;
    if (busy) return;
    var c;
    while (step < commands.length - 1) {
        if(pause) break;

        step++;
        c = commands[step];
        log.value = step;
        
        if (undoStack.length != step) alert("Error1");
        
        if (c == "pause") {
            pause=true;
            undoStack.push(emptyAction);
        }

        if (pause) {
            break; 
        } else {
            busy=true;
            await cmd(c)
            busy=false;
        }


        //console.log(undoStack.length, step);
        if (undoStack.length != step+1) alert("Error2");
    }
    if (!pause) {
        console.log(undoStack);
        //alert("error!!!");
    }

}
function savePos() {
    const ids=nodes.getIds();
    const pos = network.getPositions(ids);

    let pos1 = JSON.parse(localStorage.getItem("pos"));
    if (!pos1) pos1 = {};
    pos1[scriptfile] = pos;
    localStorage.setItem("pos", JSON.stringify(pos1));
    
    fixpos=true;
    loadPos();
    network.physics.physicsEnabled=true;
    network.physics.startSimulation();
    let s='';
     for (let id of ids) {
     const n = pos[id];
     s+=`${id},x=${n.x},y=${n.y}\n`;
     }
     console.log(s);
}

function resetPos() {
    const pos1 = JSON.parse(localStorage.getItem("pos"));
    if (!pos1) return;
    delete pos1[scriptfile];
    localStorage.setItem("pos", JSON.stringify(pos1));

    network.physics.physicsEnabled = false;
    fixpos=false;
    const ids = nodes.getIds();
    document.getElementById("reset").style.display = "none";
    for (let k of ids) {
        nodes.update({id:k, fixed: {x: fixpos,y: fixpos}});
    }
}
function loadPos() {
    const pos = JSON.parse(localStorage.getItem("pos"));
    if (!pos || !pos[scriptfile]) {
        document.getElementById("reset").style.display = "none";
        return;
    }
    document.getElementById("reset").style.display = "inline";
    const ids = nodes.getIds();
    const xy = pos[scriptfile];
    for (let k of ids) {
        if (xy[k]) {
            nodes.update({id:k, x:xy[k].x, y:xy[k].y, fixed: {x: true,y: true}});
        } else {
            nodes.update({id:k, fixed: {x: false,y: false}});
        }
    }
}

async function restart() {
    if (busy) return;
    step = -1; i = -1;
    busy = false; pause = false;
    nodes = new vis.DataSet([]); // вершины графа
    edges = new vis.DataSet([]); // рёбра графа
    network = null;
    undoStack = [];
    pathStack = [];
    log.replaceChildren([]);
    commands = prog.split("\n").filter(q => q.length > 0);

    for (let c of commands) {
        var opt = document.createElement("option");
        i++;
        opt.innerText = i + ": " + c;
        opt.value = i;
        log.appendChild(opt);
    }

    await play();
}

async function selCommand(num) {
    if (busy) return;
    if (num > step) {
        var c;
        while (step < num) {
            step++;
            c = commands[step];
            log.value = step;
            if (c == "pause" || c.startsWith('w,')) {
                undoStack.push(emptyAction);
            } else {
                await cmd(c);
            }
        }
    }
    if (num < step) {
        while (num < step) {
            undo();
        }
    }
}

var undoStack = [];
var pathStack = [];

function copyNode(oldN, n) {
    Object.assign(oldN, n);
    if (typeof oldN.color == "undefined") {
        oldN.color = null;
    }
    if (typeof oldN.label == "undefined") {
        oldN.label = null;
    }
    if (typeof oldN.shape == "undefined") {
        oldN.shape = null;
    }
}

var netOptions = {
            layout: {
            },
            edges: {
            smooth: true,
            }
        };


var directed = false;
    
function draw(fix,  dir) {
    fixpos=fix;
    directed = dir;
    loadPos();
    netOptions.edges.arrows = dir? {to : true } : {};
    let k=0;
    edges.forEach(e => {
        if (!e.label || e.label=="1") k++;
    });
    if (k==edges.length) edges.forEach(e => {
        const e1 = Object.assign({},e);
        e1.label='' 
        edges.update(e1);
    });


    network = new vis.Network(container, { nodes: nodes, edges: edges }, netOptions);
    undoStack.push(() => { network=null; })
}
async function cmd(s) {
    if (s == 'draw') {
        draw(false, false); return;
    }
    if (s == 'drawdir') {
        draw(false, true); return;
    }
    if (s == 'draw!') {
        draw(true, false); return;
    }
    if (s == 'drawdir!') {
        draw(true,true); return;
    }
    if (s[0] == '#') {undoStack.push(emptyAction);return;};

    var a = s.split(/[,=]\s*/)
    if (a[0] == 'p') {
        var oldHTML = message.innerHTML;
        undoStack.push(() => { message.innerHTML = oldHTML })
        message.innerHTML = s.substring(2)+"<br/>"+oldHTML;
    } else if (a[0] == 'w') {
        var ms = parseInt(a[1]);
        await new Promise(resolve => setTimeout(resolve, ms));
        undoStack.push(emptyAction);
        console.log("Wait ok");
    } else if (a[0] == 'path_show') {
        const nds = a[1].split('-');
        let n1 = -1, n2 = 0;
        const oldEs = [];
        const newEdges = [];
        const modEdges = [];
        const commonParams = extractEdgeParams(a,2);
        for (let ni of nds) {
            n2 = ni;
            if (n1<0) {n1=n2;continue;}

            let f = n1, t=n2;
            if (!directed && Number(n1)>Number(n2)) {
                f=n2; t=n1;
            }
            const id=`${f}-${t}`;
            var e = edges.get(id);
            if (e == null) {
                if (nodes.get(f) == null) addNode(f);
                if (nodes.get(f) == null) addNode(t);
                edges.add({ id: id, from: f, to: t});
                e = edges.get(id);
                newEdges.push(e);
            } else {
                if ("width" in commonParams) e.width=1;
                oldEs.push( Object.assign({}, e) );
            }
            Object.assign(e, commonParams);
            modEdges.push(e);
            n1=n2;
        }
        edges.update(modEdges);
        pathStack.push( [modEdges, newEdges, oldEs ]);
        undoStack.push(() => { edges.update(oldEs); edges.remove(newEdges); pathStack.pop(); });
    } else if (a[0]=='path_restore' || a[0]=='edges_restore') {
        const p = pathStack.pop();
        if (p==null) { alert(a[0]+" - команда не выполнима"); undoStack.push(emptyAction);} else {
            undoStack.push(()=>{ edges.add(p[1]); edges.update(p[0]);  pathStack.push([p[0],p[1],p[2]]);});
            edges.update(p[2]); edges.remove(p[1]);
        }
    } else if (a[0]=='edges_show') {
        let k=1;
        const oldEs = [];
        const newEdges = [];
        const modEdges = [];
        const hasWidth = s.includes(",width");
        while(a[k].includes('-')) {
            const [n1,n2] = a[k].split('-');
            const id=`${n1}-${n2}`;
            let e = edges.get(id);
            if (e == null) {
                if (nodes.get(n1) == null) addNode(n1);
                if (nodes.get(n2) == null) addNode(n2);
                if (!directed && n1>n2) [n1,n2]=[n2,n1];
                edges.add({ id: id, from: n1, to: n2});
                e = edges.get(id);
                newEdges.push(e);
            } else {
                if (hasWidth) e.width=1;
                oldEs.push( Object.assign({}, e) );
            }
            modEdges.push(e);
            k++;
        }
        const commonParams = extractEdgeParams(a,k);
        for (let e of modEdges) Object.assign(e, commonParams);
            
        edges.update(modEdges);
        pathStack.push( [modEdges, newEdges, oldEs ]);
        undoStack.push(() => { edges.update(oldEs); edges.remove(newEdges); pathStack.pop(); });
    } else if (a[0] == 'nodes_show') {
        const nds = s.split(',');
        
        const oldNodes = [];
        const newNodes = [];
        const modNodes = [];
        let k=0;
        const hasShape = s.includes(",shape");
        const hasColor = s.includes(",color");
        for (let ni of nds) {
            console.log(k,ni);
            if (k==0) {k++; continue;}
            if (!(Number(ni)>=0)) break;
            let n = nodes.get(ni);
            if (n == null) {
                addNode(n);
                newNodes.push(n);
                n = nodes.get(ni);
            } else {
                if (hasShape) n.shape='';
                if (hasColor) n.color={background:'lightblue', border:'blue'};
                oldNodes.push( Object.assign({}, n) );
            }
            modNodes.push(n);
            k++;
        }
        console.log(a);
        const commonParams = extractNodeParams(a,6);
        console.log(commonParams);
        console.log(modNodes);
        for (let n of modNodes) Object.assign(n, commonParams);
        nodes.update(modNodes);
        pathStack.push( [modNodes, newNodes, oldNodes ]);
        undoStack.push(() => { nodes.update(oldNodes); nodes.remove(newNodes); pathStack.pop(); });

    } else if (a[0]=='nodes_restore') {
        const p = pathStack.pop();
        undoStack.push(()=>{ nodes.add(p[1]); nodes.update(p[0]);  pathStack.push([p[0],p[1],p[2]]);});
        nodes.update(p[2]); nodes.remove(p[1]);
    } else if (!a[0].includes('-')) { // вершина
        var n = nodes.get(a[0]), add = false;
        var oldN = {};


        if (n == null) {
            n = { id: a[0], label: a[0] };
            add = true;
        } else {
            copyNode(oldN, n);
        }
        Object.assign(n, extractNodeParams(a));
        if (add) {
            nodes.add(n);
            undoStack.push(()=> nodes.remove(n));
        } else {
            nodes.update(n);
            undoStack.push(() => nodes.update(oldN));
        }
    } else {
        var e = edges.get(a[0])
        var c, v

        if (e == null) {
            const b = a[0].split('-');

            if(b.length==2) {
                if (nodes.get(b[0]) == null) addNode(b[0]);
                if (nodes.get(b[1]) == null) addNode(b[1]);
                let [f,t]=b;
                if (!directed && b[1]>b[0]) {f=b[0];t=b[1];}
                
                
                edges.add({ id: a[0], from: f, to: t, color: { color: 'blue' } });
                e = edges.get(a[0])
            }
        }

        var oldE = {};
        Object.assign(oldE, e)

        Object.assign(e, extractEdgeParams(a));

        edges.update(e);
        undoStack.push(() => { edges.update(oldE); })

    }
}
function extractNodeParams(a, idx=1) {
    const n={};
    for (let i = idx; i + 1 < a.length; i += 2) {
        const c = a[i], v = a[i + 1];
        if (c == 'label') n.label = v.replaceAll(/[;\/]/g, '\n');
        if (c == 'font') {
            if (!n.font) n.font={};
            n.font.size = Number(v);
        }
        if (c == 'label+') n.label += v.replaceAll(/[;\/]/g, '\n');
        if (c == 'color') {
            var cols = v.split(/[;\/]/g);
            n.color = cols[0];
            if (cols.length > 1) {
               if (!n.font) n.font={};
               n.font.color=cols[1];
            }
        }
        if (c == 'shape') n.shape = v;
        if (c == 'x') {n.x = v;n.fixed= {x: true,y: true};}
        if (c == 'y') {n.y = v;n.fixed= {x: true,y: true};}
    }
    return n;
}
function extractEdgeParams(a,s=1) {
    const e={};
    for (let i = s; i + 1 < a.length; i += 2) {
        const c = a[i], v = a[i + 1];
        if (c == 'label') e.label = v.replaceAll(/[;\/]/g, '\n');
        if (c == 'label+') e.label += v.replaceAll(/[;\/]/g, '\n');
        if (c == 'width') {
            e.width = Number(v);
        }
        if (c == 'font') {
            if (!e.font) e.font={};
            e.font.size = Number(v);
        }
        if (c == 'color') {
            var cols = v.split(/[;\/]/g)
            e.color = { color: cols[0] };
            if (cols.length > 0) {
               if (!e.font) e.font={};
               e.font.color=cols[1];
               if (cols.length > 1) {
                    e.font.background=cols[2];
               }
            }
        }
    }
    return e;
}


function reload() {
    scriptfile = document.getElementById("scriptsel").value;
    console.log("Script: ", scriptfile);
    const s = document.getElementById("commands");
    document.head.removeChild(s);
    const s2 = document.createElement("script");
    s2.id = "commands";
    s2.src = scriptfile;
    s2.charset = "windows-1251";
    s2.onload = async () => {
        console.log("Restarting...");
        await restart();
        console.log("Restarted");
    }
    document.head.appendChild(s2);
    //restart();

}
restart();